// Mirrors the posts / post_media CHECK constraints in
// supabase/migrations/20261104170000_posts.sql.
export type PostMediaType = "photo" | "video";

export type PostStatus =
  | "uploading"
  | "pending_moderation"
  | "published"
  | "held"
  | "caption_rejected"
  | "rejected"
  | "removed";

export const MAX_PHOTOS_PER_POST = 10;
export const MAX_SKATER_TAGS = 10;
export const MAX_PINNED_POSTS = 3;
export const MAX_CAPTION_LENGTH = 2200;
export const MAX_VIDEO_SECONDS = 60;

// Exactly one of the four is set, or none -- a post tags at most one spot,
// DIY (a user spot) or store, OSM or user-created.
export type PostEntityTag =
  | { kind: "spot"; spotId: string }
  | { kind: "osm_spot"; osmPlaceId: string }
  | { kind: "store"; storeId: string }
  | { kind: "osm_store"; osmPlaceId: string };

export type PostMedia = {
  mediaId: string;
  position: number;
  mediaType: PostMediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

export type Post = {
  postId: string;
  profileId: string;
  mediaType: PostMediaType;
  caption: string | null;
  status: PostStatus;
  entityTag: PostEntityTag | null;
  pinnedAt: string | null;
  archivedAt: string | null;
  likeCount: number;
  createdAt: string;
  publishedAt: string | null;
  media: PostMedia[];
};

// Kept in sync with the post_reports.reason CHECK constraint.
export const POST_REPORT_REASONS = [
  { code: "child_sexual_abuse", label: "Child sexual abuse or exploitation" },
  { code: "nsfw", label: "Nudity or sexual content" },
  { code: "gore", label: "Graphic gore" },
  { code: "harassment", label: "Bullying or harassment" },
  { code: "consent", label: "I'm in this without consent" },
  { code: "spam", label: "Spam or irrelevant" },
  { code: "other", label: "Other" },
] as const;

export type PostReportReason = (typeof POST_REPORT_REASONS)[number]["code"];

export type EntityTagColumns = {
  p_spot_id: string | null;
  p_osm_spot_place_id: string | null;
  p_store_id: string | null;
  p_osm_store_place_id: string | null;
};

export function entityTagToColumns(tag: PostEntityTag | null): EntityTagColumns {
  return {
    p_spot_id: tag?.kind === "spot" ? tag.spotId : null,
    p_osm_spot_place_id: tag?.kind === "osm_spot" ? tag.osmPlaceId : null,
    p_store_id: tag?.kind === "store" ? tag.storeId : null,
    p_osm_store_place_id: tag?.kind === "osm_store" ? tag.osmPlaceId : null,
  };
}

export type EntityTagRow = {
  spot_id: string | null;
  osm_spot_place_id: string | null;
  store_id: string | null;
  osm_store_place_id: string | null;
};

export function entityTagFromRow(row: EntityTagRow): PostEntityTag | null {
  if (row.spot_id) return { kind: "spot", spotId: row.spot_id };
  if (row.osm_spot_place_id) return { kind: "osm_spot", osmPlaceId: row.osm_spot_place_id };
  if (row.store_id) return { kind: "store", storeId: row.store_id };
  if (row.osm_store_place_id) return { kind: "osm_store", osmPlaceId: row.osm_store_place_id };
  return null;
}
