-- Unfriending, withdrawing a pending request, plus the reads behind the
-- profile's friends count and the viewer's own friends list.

-- ── remove_friend ───────────────────────────────────────────────────────
-- Deletes every row between the pair (either direction, any status) rather
-- than flipping status, so the relationship fully resets: a later
-- send_friend_request inserts a fresh row with a fresh request_id, and its
-- create_notification isn't swallowed by the (profile_id, source,
-- dedup_key) conflict an ON CONFLICT re-open of the old row would hit.
CREATE FUNCTION remove_friend(p_other_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND recipient_id = p_other_profile_id)
        OR (requester_id = p_other_profile_id AND recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'NOT_FRIENDS';
  END IF;

  DELETE FROM friend_requests
  WHERE (requester_id = auth.uid() AND recipient_id = p_other_profile_id)
     OR (requester_id = p_other_profile_id AND recipient_id = auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION remove_friend(UUID) TO authenticated;

-- ── cancel_friend_request ───────────────────────────────────────────────
-- The requester withdraws a still-pending request. Deletes the row for the
-- same fresh-request_id reason as remove_friend, and also deletes the
-- recipient's "wants to be friends" notification so they aren't left with
-- an Accept/Decline prompt for a request that no longer exists.
CREATE FUNCTION cancel_friend_request(p_recipient_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM friend_requests
  WHERE requester_id = auth.uid()
    AND recipient_id = p_recipient_id
    AND status = 'pending'
  RETURNING request_id INTO v_request_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  DELETE FROM notifications
  WHERE profile_id = p_recipient_id
    AND source = 'friend_request'
    AND dedup_key = v_request_id::TEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION cancel_friend_request(UUID) TO authenticated;

-- ── get_friend_count ────────────────────────────────────────────────────
-- SECURITY DEFINER because friend_requests' RLS only exposes rows to their
-- participants, and the count is shown on other users' profiles too.
CREATE FUNCTION get_friend_count(p_profile_id UUID) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER
  FROM friend_requests
  WHERE status = 'accepted'
    AND (requester_id = p_profile_id OR recipient_id = p_profile_id);
$$;
GRANT EXECUTE ON FUNCTION get_friend_count(UUID) TO authenticated;

-- ── get_my_friends ──────────────────────────────────────────────────────
-- Invoker rights are enough: the caller is a participant in every row it
-- reads. Returns whole profiles rows so the client picks columns with
-- .select(), same as a plain table query.
CREATE FUNCTION get_my_friends() RETURNS SETOF profiles
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p.*
  FROM friend_requests r
  JOIN profiles p
    ON p.profile_id = CASE WHEN r.requester_id = auth.uid() THEN r.recipient_id ELSE r.requester_id END
  WHERE r.status = 'accepted'
    AND (r.requester_id = auth.uid() OR r.recipient_id = auth.uid())
  ORDER BY p.username;
$$;
GRANT EXECUTE ON FUNCTION get_my_friends() TO authenticated;
