-- Fix a deadlock in review visibility: "spot_reviews_read"/"store_reviews_read"
-- (originally spot_cards_read/store_cards_read, 20260511/20260510012442) only
-- let a review's own author see it until it reaches is_verified (3 upvotes,
-- see sync_spot_review_votes/sync_store_review_votes). But nobody except the
-- author could ever cast one of those 3 votes in the first place -- the
-- review was invisible to them. ReviewCard.tsx's "NEEDS VOTES x/3" badge
-- (rendered specifically for other users to act on) could never actually be
-- seen by anyone who could vote on it, and fetchSpotReviews/fetchStoreReviews
-- already query with no is_verified filter, confirming the intent was always
-- for every review to be publicly readable -- is_verified is meant to gate
-- the average-rating calculation (fetchSpotAverageRating/
-- fetchStoreAverageRating) and the "needs votes" badge, not visibility.

ALTER POLICY "spot_reviews_read" ON spot_reviews USING (true);
ALTER POLICY "store_reviews_read" ON store_reviews USING (true);
