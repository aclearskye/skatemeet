import { supabase } from "@/lib/supabaseClient";
import { entityTagFromRow, type EntityTagRow, type Post, type PostMediaType, type PostStatus } from "./types";

// RLS (can_see_post) decides visibility: published + unarchived posts from
// profiles the viewer can see, plus every state of the viewer's own posts.
export const POST_SELECT = `
  post_id, profile_id, media_type, caption, status, pinned_at, archived_at,
  like_count, created_at, published_at,
  spot_id, osm_spot_place_id, store_id, osm_store_place_id,
  post_media ( media_id, position, media_type, media_url, thumbnail_url, width, height, duration_seconds )
`;

type PostMediaRow = {
  media_id: string;
  position: number;
  media_type: PostMediaType;
  media_url: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
};

export type PostRow = EntityTagRow & {
  post_id: string;
  profile_id: string;
  media_type: PostMediaType;
  caption: string | null;
  status: PostStatus;
  pinned_at: string | null;
  archived_at: string | null;
  like_count: number;
  created_at: string;
  published_at: string | null;
  post_media: PostMediaRow[];
};

export function mapPostRow(row: PostRow): Post {
  return {
    postId: row.post_id,
    profileId: row.profile_id,
    mediaType: row.media_type,
    caption: row.caption,
    status: row.status,
    entityTag: entityTagFromRow(row),
    pinnedAt: row.pinned_at,
    archivedAt: row.archived_at,
    likeCount: row.like_count,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    media: [...row.post_media]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        mediaId: m.media_id,
        position: m.position,
        mediaType: m.media_type,
        mediaUrl: m.media_url,
        thumbnailUrl: m.thumbnail_url,
        width: m.width,
        height: m.height,
        durationSeconds: m.duration_seconds,
      })),
  };
}

export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("post_id", postId).maybeSingle();
  if (error) throw error;
  return data ? mapPostRow(data as unknown as PostRow) : null;
}

// My Posts: published and unarchived, newest first. Pinned posts stay in
// their place here; PostGrid adds a pinned copy of each at the front.
export async function fetchProfilePosts(profileId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("profile_id", profileId)
    .eq("status", "published")
    .is("archived_at", null)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PostRow[]).map(mapPostRow);
}

export async function getProfilePostCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("posts")
    .select("post_id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("status", "published")
    .is("archived_at", null);
  if (error) throw error;
  return count ?? 0;
}

// The author's posts that aren't live yet (or were held/blocked), so the
// composer and profile can show "under review" / "edit your caption".
export async function fetchMyPendingPosts(profileId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("profile_id", profileId)
    .in("status", ["uploading", "pending_moderation", "held", "caption_rejected"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as PostRow[]).map(mapPostRow);
}
