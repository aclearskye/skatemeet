-- Fix: sync_spot_review_votes/sync_store_review_votes ran as SECURITY INVOKER
-- (the default), so their internal `UPDATE spot_reviews/store_reviews SET
-- upvote_count = ...` was silently blocked by RLS -- spot_reviews/store_reviews
-- has no UPDATE policy (writes only ever go through review creation/delete),
-- so a vote toggle's count sync never actually persisted. This surfaced as
-- the upvote count flashing to the optimistic value and then reverting to 0
-- once the post-mutation refetch read the real (unchanged) row.
--
-- Entity photos don't hit this because their vote/report RPCs
-- (cast_spot_photo_vote etc.) are themselves SECURITY DEFINER, so the INSERT
-- they perform -- and the trigger it fires -- already runs under an elevated
-- role. Review votes are cast via a plain client-side insert (toggleVoteRow),
-- same as the original card-votes pattern, so there's no enclosing
-- SECURITY DEFINER call to inherit privileges from -- the trigger function
-- itself needs to be marked SECURITY DEFINER instead.

CREATE OR REPLACE FUNCTION sync_spot_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE spot_reviews
  SET
    upvote_count = (SELECT COUNT(*) FROM spot_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM spot_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sync_store_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE store_reviews
  SET
    upvote_count = (SELECT COUNT(*) FROM store_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM store_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;
