-- Store tickets, part 2d (docs/ACCOUNT_TYPES.md, "Store", Tickets):
-- signed waivers for the store to look up and keep.
--
--   * get_store_waivers: the store's signed waivers, newest first, 50 at a
--     time, searchable by the signer's name.
--   * export_store_waivers: every waiver SkateMeet still holds for the
--     store in a date range, with the exact waiver text each one agreed to,
--     for a CSV the store keeps in its own systems.
--   * get_store_waiver: one waiver with its text, for a printable page.
--
-- The store owns these (it's the data controller); SkateMeet only keeps
-- them for 30 days after the ticket finishes (purge_ticket_waivers). Any
-- approved store can read its own waivers, paid or not.

CREATE FUNCTION _store_waiver_row_json(p_waiver ticket_waivers, p_with_text BOOLEAN) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ticket_id', p_waiver.ticket_id,
    'signed_at', p_waiver.signed_at,
    'full_name', p_waiver.full_name,
    'date_of_birth', p_waiver.date_of_birth,
    'emergency_name', p_waiver.emergency_name,
    'emergency_phone', p_waiver.emergency_phone,
    'signed_name', p_waiver.signed_name,
    'waiver_version', s.version,
    'waiver_text', CASE WHEN p_with_text THEN s.body END,
    'ticket_name', k.name,
    'ticket_status', k.status,
    'account_name', coalesce(p.display_name, p.username),
    'under_18', k.bought_as_under_18 OR _is_child(p_waiver.buyer_id)
  )
  FROM store_waivers s, tickets k, profiles p
  WHERE s.waiver_id = p_waiver.waiver_id AND k.ticket_id = p_waiver.ticket_id AND p.profile_id = p_waiver.buyer_id;
$$;

CREATE FUNCTION get_store_waivers(p_search TEXT, p_before TIMESTAMPTZ) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_search TEXT := lower(NULLIF(btrim(p_search), ''));
BEGIN
  RETURN coalesce((
    SELECT jsonb_agg(item ORDER BY signed_at DESC)
    FROM (
      SELECT _store_waiver_row_json(w, false) AS item, w.signed_at
      FROM ticket_waivers w
      WHERE w.store_owner_id = v_store
        AND (p_before IS NULL OR w.signed_at < p_before)
        AND (v_search IS NULL OR position(v_search IN lower(w.full_name)) > 0)
      ORDER BY w.signed_at DESC
      LIMIT 50
    ) page
  ), '[]'::JSONB);
END;
$$;

-- Dates are the store's calendar days (inclusive). Capped at 5000 rows.
CREATE FUNCTION export_store_waivers(p_from DATE, p_to DATE) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_tz TEXT;
BEGIN
  SELECT coalesce(timezone, 'Europe/London') INTO v_tz FROM store_ticketing WHERE profile_id = v_store;
  v_tz := coalesce(v_tz, 'Europe/London');
  RETURN coalesce((
    SELECT jsonb_agg(item ORDER BY signed_at)
    FROM (
      SELECT _store_waiver_row_json(w, true) AS item, w.signed_at
      FROM ticket_waivers w
      WHERE w.store_owner_id = v_store
        AND (p_from IS NULL OR (w.signed_at AT TIME ZONE v_tz)::DATE >= p_from)
        AND (p_to IS NULL OR (w.signed_at AT TIME ZONE v_tz)::DATE <= p_to)
      ORDER BY w.signed_at
      LIMIT 5000
    ) page
  ), '[]'::JSONB);
END;
$$;

CREATE FUNCTION get_store_waiver(p_ticket_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_waiver ticket_waivers%ROWTYPE;
BEGIN
  SELECT * INTO v_waiver FROM ticket_waivers WHERE ticket_id = p_ticket_id AND store_owner_id = v_store;
  IF v_waiver.ticket_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN _store_waiver_row_json(v_waiver, true);
END;
$$;

REVOKE EXECUTE ON FUNCTION
  _store_waiver_row_json(ticket_waivers, BOOLEAN),
  get_store_waivers(TEXT, TIMESTAMPTZ), export_store_waivers(DATE, DATE), get_store_waiver(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  get_store_waivers(TEXT, TIMESTAMPTZ), export_store_waivers(DATE, DATE), get_store_waiver(UUID)
TO authenticated;
