-- Passes valid for a number of days from purchase (docs/ACCOUNT_TYPES.md,
-- "Store", Tickets, decided 2026-11-26), next to passes with set dates.
--
--   * ticket_types.pass_days: a pass is either set dates (valid_from and
--     valid_to, as before) or pass_days (1 to 366), never both.
--   * At purchase (and on a swap to one), the ticket gets real dates:
--     from the store's today to today + pass_days - 1, so the day it's
--     bought counts as day 1. Everything downstream (scanning, expiry,
--     waiver retention, My tickets) reads those dates as before.
--   * A days-from-purchase pass never goes off sale by date.

ALTER TABLE ticket_types ADD COLUMN pass_days INT CHECK (pass_days BETWEEN 1 AND 366);

ALTER TABLE ticket_types DROP CONSTRAINT ticket_types_shape;
ALTER TABLE ticket_types ADD CONSTRAINT ticket_types_shape CHECK (
  (kind = 'session'
    AND weekday IS NOT NULL AND valid_from IS NULL AND valid_to IS NULL AND pass_days IS NULL
    AND (start_time IS NULL) = (end_time IS NULL)
    AND (start_time IS NULL OR end_time > start_time))
  OR
  (kind = 'pass'
    AND weekday IS NULL AND start_time IS NULL AND end_time IS NULL
    AND (
      (pass_days IS NULL AND valid_from IS NOT NULL AND valid_to >= valid_from AND valid_to <= valid_from + 366)
      OR (pass_days IS NOT NULL AND valid_from IS NULL AND valid_to IS NULL)
    ))
);

-- The store's calendar day now.
CREATE FUNCTION _store_today(p_owner UUID) RETURNS DATE
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (now() AT TIME ZONE coalesce(
    (SELECT timezone FROM store_ticketing WHERE profile_id = p_owner), 'Europe/London'))::DATE;
$$;

-- The dates a ticket of this type gets if issued now.
CREATE FUNCTION _ticket_valid_from(p_type ticket_types) RETURNS DATE
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_type.pass_days IS NOT NULL THEN _store_today(p_type.store_owner_id) ELSE p_type.valid_from END;
$$;

CREATE FUNCTION _ticket_valid_to(p_type ticket_types) RETURNS DATE
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_type.pass_days IS NOT NULL
              THEN _store_today(p_type.store_owner_id) + p_type.pass_days - 1
              ELSE p_type.valid_to END;
$$;

CREATE OR REPLACE FUNCTION _ticket_type_on_sale(p_type ticket_types) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_type.is_active AND (
    p_type.kind = 'session'
    OR p_type.pass_days IS NOT NULL
    OR p_type.valid_to >= _store_today(p_type.store_owner_id)
  );
$$;

CREATE OR REPLACE FUNCTION _ticket_type_json(p_type ticket_types) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ticket_type_id', p_type.ticket_type_id, 'kind', p_type.kind, 'name', p_type.name,
    'description', p_type.description, 'price_minor', p_type.price_minor, 'currency', p_type.currency,
    'weekday', p_type.weekday,
    'start_time', to_char(p_type.start_time, 'HH24:MI'), 'end_time', to_char(p_type.end_time, 'HH24:MI'),
    'valid_from', p_type.valid_from, 'valid_to', p_type.valid_to, 'pass_days', p_type.pass_days,
    'is_active', p_type.is_active
  );
$$;

-- ── Saving a ticket type: now with pass_days ───────────────────────────────

DROP FUNCTION save_ticket_type(UUID, TEXT, TEXT, TEXT, INT, SMALLINT, TIME, TIME, DATE, DATE);

-- Creates (p_ticket_type_id NULL) or edits a ticket type. A pass takes
-- either p_valid_from/p_valid_to or p_pass_days. Tickets already sold keep
-- their own snapshot.
CREATE FUNCTION save_ticket_type(
  p_ticket_type_id UUID, p_kind TEXT, p_name TEXT, p_description TEXT, p_price_minor INT,
  p_weekday SMALLINT, p_start_time TIME, p_end_time TIME, p_valid_from DATE, p_valid_to DATE, p_pass_days INT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_currency TEXT;
  v_id UUID;
  v_rolling BOOLEAN := p_kind = 'pass' AND p_pass_days IS NOT NULL;
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  SELECT currency INTO v_currency FROM store_ticketing WHERE profile_id = v_uid;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'TICKETING_NOT_CONNECTED';
  END IF;
  IF p_kind NOT IN ('session', 'pass') THEN
    RAISE EXCEPTION 'INVALID_TICKET';
  END IF;

  IF p_ticket_type_id IS NULL THEN
    IF (SELECT count(*) FROM ticket_types WHERE store_owner_id = v_uid) >= 50 THEN
      RAISE EXCEPTION 'TOO_MANY_TICKET_TYPES';
    END IF;
    INSERT INTO ticket_types (store_owner_id, kind, name, description, price_minor, currency,
                              weekday, start_time, end_time, valid_from, valid_to, pass_days)
    VALUES (v_uid, p_kind, btrim(p_name), NULLIF(btrim(p_description), ''), p_price_minor, v_currency,
            CASE WHEN p_kind = 'session' THEN p_weekday END,
            CASE WHEN p_kind = 'session' THEN p_start_time END,
            CASE WHEN p_kind = 'session' THEN p_end_time END,
            CASE WHEN p_kind = 'pass' AND NOT v_rolling THEN p_valid_from END,
            CASE WHEN p_kind = 'pass' AND NOT v_rolling THEN p_valid_to END,
            CASE WHEN v_rolling THEN p_pass_days END)
    RETURNING ticket_type_id INTO v_id;
  ELSE
    UPDATE ticket_types SET
      kind = p_kind, name = btrim(p_name), description = NULLIF(btrim(p_description), ''),
      price_minor = p_price_minor,
      weekday = CASE WHEN p_kind = 'session' THEN p_weekday END,
      start_time = CASE WHEN p_kind = 'session' THEN p_start_time END,
      end_time = CASE WHEN p_kind = 'session' THEN p_end_time END,
      valid_from = CASE WHEN p_kind = 'pass' AND NOT v_rolling THEN p_valid_from END,
      valid_to = CASE WHEN p_kind = 'pass' AND NOT v_rolling THEN p_valid_to END,
      pass_days = CASE WHEN v_rolling THEN p_pass_days END,
      updated_at = now()
    WHERE ticket_type_id = p_ticket_type_id AND store_owner_id = v_uid
    RETURNING ticket_type_id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND';
    END IF;
  END IF;
  RETURN v_id;
EXCEPTION
  WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'INVALID_TICKET';
END;
$$;

-- ── Issuing tickets: real dates for a days-from-purchase pass ──────────────

DO $do$
DECLARE
  v_def TEXT;
BEGIN
  v_def := pg_get_functiondef('_begin_ticket_purchase(uuid, uuid)'::REGPROCEDURE);
  v_def := replace(v_def,
    $old$v_type.valid_from, v_type.valid_to,$old$,
    $new$_ticket_valid_from(v_type), _ticket_valid_to(v_type),$new$);
  IF position('_ticket_valid_from(v_type)' IN v_def) = 0 THEN
    RAISE EXCEPTION '_begin_ticket_purchase rewrite did not apply';
  END IF;
  EXECUTE v_def;

  v_def := pg_get_functiondef('_apply_ticket_swap(uuid)'::REGPROCEDURE);
  v_def := replace(v_def,
    $old$v_target.valid_from, v_target.valid_to,$old$,
    $new$_ticket_valid_from(v_target), _ticket_valid_to(v_target),$new$);
  IF position('_ticket_valid_from(v_target)' IN v_def) = 0 THEN
    RAISE EXCEPTION '_apply_ticket_swap rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

REVOKE EXECUTE ON FUNCTION
  _store_today(UUID), _ticket_valid_from(ticket_types), _ticket_valid_to(ticket_types),
  _ticket_type_on_sale(ticket_types), _ticket_type_json(ticket_types),
  save_ticket_type(UUID, TEXT, TEXT, TEXT, INT, SMALLINT, TIME, TIME, DATE, DATE, INT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION save_ticket_type(UUID, TEXT, TEXT, TEXT, INT, SMALLINT, TIME, TIME, DATE, DATE, INT)
TO authenticated;
