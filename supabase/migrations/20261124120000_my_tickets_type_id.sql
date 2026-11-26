-- get_my_tickets also returns each ticket's ticket_type_id, so a store page
-- can show "View QR" instead of "Buy" for a ticket the skater already holds.

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('get_my_tickets()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'ticket_id', k.ticket_id,$old$,
    $new$'ticket_id', k.ticket_id, 'ticket_type_id', k.ticket_type_id,$new$);
  IF position('ticket_type_id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'get_my_tickets rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;
