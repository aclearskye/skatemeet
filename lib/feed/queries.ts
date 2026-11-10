import type { Coordinates } from "@/lib/map/types";
import { fetchPostsByIds, type PostWithPeople } from "@/lib/posts/listQueries";
import { supabase } from "@/lib/supabaseClient";
import type { FeedCursor, FeedTab } from "./types";

export const FEED_PAGE_SIZE = 10;

export type FeedPage = { posts: PostWithPeople[]; nextCursor: FeedCursor | null };

// get_feed ranks ids (recency, likes, follows, tagged nearby) at a fixed
// asOf so pages stay stable while scrolling; posts are then loaded by id.
export async function fetchFeedPage(
  tab: FeedTab,
  location: Coordinates | null,
  asOf: string,
  cursor: FeedCursor | null
): Promise<FeedPage> {
  const { data, error } = await supabase.rpc("get_feed", {
    p_tab: tab,
    p_lat: location?.lat ?? null,
    p_lng: location?.lng ?? null,
    p_as_of: asOf,
    p_after_score: cursor?.score ?? null,
    p_after_id: cursor?.postId ?? null,
    p_limit: FEED_PAGE_SIZE,
  });
  if (error) throw error;
  const ranked = data as { post_id: string; score: number }[];
  const posts = await fetchPostsByIds(ranked.map((r) => r.post_id));
  const last = ranked[ranked.length - 1];
  return {
    posts,
    nextCursor: ranked.length === FEED_PAGE_SIZE && last ? { score: last.score, postId: last.post_id } : null,
  };
}
