-- Phase 1: Business account types and verification requests

-- 1. Extend profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user'
    CHECK (account_type IN ('user', 'business_pending', 'business_verified')),
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_verified_at TIMESTAMPTZ;

-- 2. Business verification requests table
CREATE TABLE IF NOT EXISTS business_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_at TIMESTAMPTZ,
  evidence_url TEXT,
  review_notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS bvr_profile_id_pending_unique
  ON business_verification_requests (profile_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS bvr_profile_id_idx
  ON business_verification_requests (profile_id);

-- 3. Trigger: sync profiles when admin changes request status
CREATE OR REPLACE FUNCTION sync_profile_on_request_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE profiles
    SET account_type = 'business_verified',
        business_verified_at = now()
    WHERE profile_id = NEW.profile_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE profiles
    SET account_type = 'user',
        business_verified_at = NULL
    WHERE profile_id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_on_request_status
  ON business_verification_requests;

CREATE TRIGGER trg_sync_profile_on_request_status
  AFTER UPDATE OF status ON business_verification_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_profile_on_request_status();

-- 4. RLS for business_verification_requests
ALTER TABLE business_verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "users_read_own_requests"
  ON business_verification_requests
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own request (one at a time, enforced by unique index)
CREATE POLICY "users_insert_own_request"
  ON business_verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Only service role can update status (admin workflow via table editor)
-- No UPDATE policy for authenticated role — service role bypasses RLS by default.
