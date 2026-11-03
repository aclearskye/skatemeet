-- respond_to_friend_request now also resolves the notification that
-- prompted it, as a side effect -- same "thin RPC + automatic side effect"
-- shape as admin_ban_user auto-resolving profile_reports. This lets the
-- recipient respond either from the notifications inbox or directly from
-- the requester's profile page (AddFriendButton) without the client having
-- to know or pass the notification's id -- the request_id (== dedup_key)
-- already identifies it.

CREATE OR REPLACE FUNCTION respond_to_friend_request(p_request_id UUID, p_accept BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request RECORD;
  v_recipient_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_request FROM friend_requests WHERE request_id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  IF v_request.recipient_id != auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_REQUEST';
  END IF;
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'REQUEST_ALREADY_RESOLVED';
  END IF;

  UPDATE friend_requests
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END, responded_at = now()
  WHERE request_id = p_request_id;

  UPDATE notifications
  SET read_at = now()
  WHERE profile_id = auth.uid()
    AND source = 'friend_request'
    AND dedup_key = p_request_id::TEXT
    AND read_at IS NULL;

  IF p_accept THEN
    SELECT username INTO v_recipient_username FROM profiles WHERE profile_id = auth.uid();
    PERFORM create_notification(
      v_request.requester_id,
      'friend_request_accepted',
      p_request_id::TEXT,
      '@' || v_recipient_username || ' ACCEPTED YOUR FRIEND REQUEST',
      'success',
      'FRIEND REQUEST ACCEPTED'
    );
  END IF;
END;
$$;
