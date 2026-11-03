-- Friend requests (mutual, requires acceptance) plus the account-privacy
-- flag backing the gated "message" button on another user's profile.
--
-- Deliberately a new table rather than repurposing crew_follows: that table
-- is an instant, unilateral follow with no acceptance step (and currently
-- unwired to any UI), while a friend request needs pending/accepted/declined
-- states. Modeled directly on profile_reports' shape (20260925000000) --
-- requester/recipient/status, writes only via SECURITY DEFINER RPCs, no
-- client INSERT/UPDATE policy.

CREATE TABLE friend_requests (
  request_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id != recipient_id),
  -- One row per ordered pair -- re-requesting after a decline re-opens the
  -- same row (see send_friend_request's ON CONFLICT) rather than erroring.
  UNIQUE (requester_id, recipient_id)
);

CREATE INDEX friend_requests_recipient_pending_idx
  ON friend_requests (recipient_id) WHERE status = 'pending';

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friend_requests_select_participant" ON friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
-- No INSERT/UPDATE policy -- writes only via the SECURITY DEFINER RPCs below.

-- ── send_friend_request ─────────────────────────────────────────────────
CREATE FUNCTION send_friend_request(p_recipient_id UUID) RETURNS UUID
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

  -- Friendship is undirected once accepted -- check both row orderings.
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
    'FRIEND REQUEST'
  );

  RETURN v_request_id;
END;
$$;
GRANT EXECUTE ON FUNCTION send_friend_request(UUID) TO authenticated;

-- ── respond_to_friend_request ───────────────────────────────────────────
CREATE FUNCTION respond_to_friend_request(p_request_id UUID, p_accept BOOLEAN) RETURNS VOID
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
GRANT EXECUTE ON FUNCTION respond_to_friend_request(UUID, BOOLEAN) TO authenticated;

-- ── get_friend_status: one round trip for AddFriendButton's state ──────
CREATE FUNCTION get_friend_status(p_other_profile_id UUID)
RETURNS TABLE(status TEXT, request_id UUID, is_requester BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT r.status, r.request_id, r.requester_id = auth.uid()
    FROM friend_requests r
    WHERE (r.requester_id = auth.uid() AND r.recipient_id = p_other_profile_id)
       OR (r.requester_id = p_other_profile_id AND r.recipient_id = auth.uid())
    ORDER BY r.created_at DESC
    LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION get_friend_status(UUID) TO authenticated;

-- ── Account privacy (backs the gated message button) ────────────────────
-- No new RLS policy needed: ProfileAvatar.tsx already does a direct
-- supabase.from("profiles").update(...).eq("profile_id", profileId) from the
-- client today, which only works because an owner-scoped UPDATE policy on
-- profiles already exists (it predates this migrations folder). The privacy
-- toggle reuses that same existing policy.
ALTER TABLE profiles
  ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT false;
