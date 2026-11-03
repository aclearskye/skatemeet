-- 1. Generic "this notification is about this profile" link, so a row
--    (e.g. a friend request) can be tapped through to the relevant profile
--    without parsing message text or an extra client-side lookup. Nullable
--    -- most notification sources don't need it.
ALTER TABLE notifications
  ADD COLUMN related_profile_id UUID REFERENCES profiles(profile_id) ON DELETE SET NULL;

-- 2. create_notification grows an optional trailing parameter for it.
--    CREATE OR REPLACE rather than a new function, same as the original --
--    every existing call site keeps working since the new param defaults
--    to NULL, and Postgres allows appending defaulted params in place.
CREATE OR REPLACE FUNCTION create_notification(
  p_profile_id UUID,
  p_source     TEXT,
  p_dedup_key  TEXT,
  p_message    TEXT,
  p_variant    TEXT,
  p_label      TEXT DEFAULT NULL,
  p_related_profile_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (profile_id, source, dedup_key, message, variant, label, related_profile_id)
  VALUES (p_profile_id, p_source, p_dedup_key, p_message, p_variant, p_label, p_related_profile_id)
  ON CONFLICT (profile_id, source, dedup_key) DO NOTHING
  RETURNING notification_id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 3. send_friend_request / respond_to_friend_request now pass the other
--    party's profile_id, so the recipient's "wants to be friends"
--    notification links to the requester, and the requester's "accepted"
--    notification links to whoever accepted them.
CREATE OR REPLACE FUNCTION send_friend_request(p_recipient_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request_id UUID;
  v_requester_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_FRIEND_SELF';
  END IF;

  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND recipient_id = p_recipient_id)
        OR (requester_id = p_recipient_id AND recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'ALREADY_FRIENDS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'pending'
      AND ((requester_id = auth.uid() AND recipient_id = p_recipient_id)
        OR (requester_id = p_recipient_id AND recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'REQUEST_ALREADY_PENDING';
  END IF;

  SELECT username INTO v_requester_username FROM profiles WHERE profile_id = auth.uid();

  INSERT INTO friend_requests (requester_id, recipient_id)
  VALUES (auth.uid(), p_recipient_id)
  ON CONFLICT (requester_id, recipient_id) DO UPDATE
    SET status = 'pending', created_at = now(), responded_at = NULL
  RETURNING request_id INTO v_request_id;

  PERFORM create_notification(
    p_recipient_id,
    'friend_request',
    v_request_id::TEXT,
    '@' || v_requester_username || ' WANTS TO BE FRIENDS',
    'info',
    'FRIEND REQUEST',
    auth.uid()
  );

  RETURN v_request_id;
END;
$$;

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
      'FRIEND REQUEST ACCEPTED',
      auth.uid()
    );
  END IF;
END;
$$;

-- 4. Data repair: a friend_request notification could already have been
--    marked read merely by visiting the inbox, before the fix that
--    excluded it from that bulk "mark everything read on focus" sweep.
--    Restore it to unread (and therefore actionable again) whenever its
--    underlying request is still actually pending.
UPDATE notifications n
SET read_at = NULL
WHERE n.source = 'friend_request'
  AND n.read_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM friend_requests fr
    WHERE fr.request_id::TEXT = n.dedup_key AND fr.status = 'pending'
  );

-- 5. Backfill related_profile_id for notifications created before this
--    column existed, so older rows are tappable too, not just new ones.
UPDATE notifications n
SET related_profile_id = fr.requester_id
FROM friend_requests fr
WHERE n.source = 'friend_request'
  AND n.dedup_key = fr.request_id::TEXT
  AND n.related_profile_id IS NULL;

UPDATE notifications n
SET related_profile_id = fr.recipient_id
FROM friend_requests fr
WHERE n.source = 'friend_request_accepted'
  AND n.dedup_key = fr.request_id::TEXT
  AND n.related_profile_id IS NULL;
