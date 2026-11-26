-- "Save my details for next time" on a store's waiver (docs/ACCOUNT_TYPES.md,
-- "Store", Tickets, decided 2026-11-26).
--
--   * Opt-in, per skater per store: ticking the box saves the skater's
--     details (full name, date of birth, emergency contact) for that store's
--     waiver only. Another store's waiver starts empty until the skater has
--     signed it once there.
--   * Tied to the waiver version they signed: when the store changes its
--     waiver, the saved details stop filling in and the skater fills the new
--     one out again.
--   * The typed signature and the "I agree" tick are never saved.
--   * Signing again without the box ticked deletes what was saved there.
--
-- Replaces the earlier prefill, which used the skater's last waiver at any
-- store. Saved details are the skater's own data, kept apart from the
-- signed waivers the store owns (which are deleted 30 days after the
-- ticket finishes).

CREATE TABLE waiver_saved_details (
  buyer_id         UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  store_owner_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  -- The version they were saved against. A newer version doesn't prefill.
  waiver_id        UUID NOT NULL REFERENCES store_waivers(waiver_id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  date_of_birth    DATE NOT NULL,
  emergency_name   TEXT NOT NULL CHECK (char_length(emergency_name) BETWEEN 2 AND 120),
  emergency_phone  TEXT NOT NULL CHECK (emergency_phone ~ '^\+?[0-9 ()-]{6,30}$'),
  saved_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_id, store_owner_id)
);

ALTER TABLE waiver_saved_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON waiver_saved_details FROM anon, authenticated;

-- What a buyer sees before paying: the store's current waiver (NULL when it
-- has none) and their saved details for exactly this store and version.
CREATE OR REPLACE FUNCTION get_ticket_waiver_form(p_owner UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_waiver store_waivers;
  v_saved waiver_saved_details%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  v_waiver := _current_store_waiver(p_owner);
  IF v_waiver.waiver_id IS NULL OR NOT _is_approved_store(p_owner) OR is_blocked_between(v_uid, p_owner) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_saved FROM waiver_saved_details
  WHERE buyer_id = v_uid AND store_owner_id = p_owner AND waiver_id = v_waiver.waiver_id;
  RETURN jsonb_build_object(
    'version', v_waiver.version,
    'body', v_waiver.body,
    'prefill', CASE WHEN v_saved.buyer_id IS NULL THEN NULL ELSE jsonb_build_object(
      'full_name', v_saved.full_name, 'date_of_birth', v_saved.date_of_birth,
      'emergency_name', v_saved.emergency_name, 'emergency_phone', v_saved.emergency_phone) END
  );
END;
$$;

-- As before, plus: p_waiver.save_details true saves the details for this
-- store and version; anything else clears what was saved for this store.
CREATE OR REPLACE FUNCTION _attach_ticket_waiver(p_ticket_id UUID, p_buyer UUID, p_waiver JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_waiver store_waivers;
  v_dob DATE;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = p_ticket_id AND buyer_id = p_buyer AND status = 'pending';
  IF v_ticket.ticket_id IS NULL THEN
    RAISE EXCEPTION 'TICKET_NOT_ON_SALE';
  END IF;
  v_waiver := _current_store_waiver(v_ticket.store_owner_id);
  IF v_waiver.waiver_id IS NULL THEN
    RETURN;
  END IF;
  IF p_waiver IS NULL OR jsonb_typeof(p_waiver) <> 'object' THEN
    RAISE EXCEPTION 'WAIVER_REQUIRED';
  END IF;
  IF (p_waiver->>'version')::INT IS DISTINCT FROM v_waiver.version THEN
    RAISE EXCEPTION 'WAIVER_CHANGED';
  END IF;
  IF (p_waiver->>'agreed')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END IF;
  BEGIN
    v_dob := (p_waiver->>'date_of_birth')::DATE;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END;
  IF v_dob IS NULL OR v_dob >= current_date THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END IF;

  INSERT INTO ticket_waivers (ticket_id, waiver_id, store_owner_id, buyer_id, full_name, date_of_birth,
                              emergency_name, emergency_phone, signed_name)
  VALUES (p_ticket_id, v_waiver.waiver_id, v_ticket.store_owner_id, p_buyer,
          btrim(p_waiver->>'full_name'), v_dob,
          btrim(p_waiver->>'emergency_name'), btrim(p_waiver->>'emergency_phone'),
          btrim(p_waiver->>'signed_name'));

  IF (p_waiver->>'save_details')::BOOLEAN IS TRUE THEN
    INSERT INTO waiver_saved_details (buyer_id, store_owner_id, waiver_id, full_name, date_of_birth,
                                      emergency_name, emergency_phone)
    VALUES (p_buyer, v_ticket.store_owner_id, v_waiver.waiver_id, btrim(p_waiver->>'full_name'), v_dob,
            btrim(p_waiver->>'emergency_name'), btrim(p_waiver->>'emergency_phone'))
    ON CONFLICT (buyer_id, store_owner_id) DO UPDATE SET
      waiver_id = EXCLUDED.waiver_id,
      full_name = EXCLUDED.full_name,
      date_of_birth = EXCLUDED.date_of_birth,
      emergency_name = EXCLUDED.emergency_name,
      emergency_phone = EXCLUDED.emergency_phone,
      saved_at = now();
  ELSE
    DELETE FROM waiver_saved_details WHERE buyer_id = p_buyer AND store_owner_id = v_ticket.store_owner_id;
  END IF;
EXCEPTION
  WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
END;
$$;

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'ticket_waivers', _export_rows('ticket_waivers', 'buyer_id', v_uid),$old$,
    $new$'ticket_waivers', _export_rows('ticket_waivers', 'buyer_id', v_uid),
    'waiver_saved_details', _export_rows('waiver_saved_details', 'buyer_id', v_uid),$new$);
  IF position('''waiver_saved_details''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

REVOKE EXECUTE ON FUNCTION get_ticket_waiver_form(UUID), _attach_ticket_waiver(UUID, UUID, JSONB)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_waiver_form(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION _attach_ticket_waiver(UUID, UUID, JSONB) TO service_role;
