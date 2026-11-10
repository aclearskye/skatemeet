import { supabase } from "@/lib/supabaseClient";
import type { CaptionFlagItem, CsamHoldItem, HeldPostItem, HeldPostMedia, HeldVideoPreview } from "./types";

type HeldPostRow = {
  post_id: string;
  profile_id: string;
  username: string;
  media_type: "photo" | "video";
  caption: string | null;
  hold_reason: string | null;
  is_urgent: boolean;
  created_at: string;
  report_count: number;
  report_reasons: string[] | null;
  media: { media_id: string; position: number; bucket: string; storage_path: string | null; media_url: string | null }[] | null;
};

// Urgent first (nudity holds, child-safety reports), then oldest first.
export async function fetchHeldPosts(): Promise<HeldPostItem[]> {
  const { data, error } = await supabase.rpc("admin_list_held_posts");
  if (error) throw error;

  return (data as HeldPostRow[]).map((row) => ({
    postId: row.post_id,
    profileId: row.profile_id,
    username: row.username,
    mediaType: row.media_type,
    caption: row.caption,
    holdReason: row.hold_reason,
    isUrgent: row.is_urgent,
    createdAt: row.created_at,
    reportCount: row.report_count,
    reportReasons: row.report_reasons ?? [],
    media: (row.media ?? []).map((m) => ({
      mediaId: m.media_id,
      position: m.position,
      bucket: m.bucket,
      storagePath: m.storage_path,
      mediaUrl: m.media_url,
    })),
  }));
}

// Held media that never published lives in the private quarantine bucket;
// post_quarantine_admin_read lets an admin mint a short-lived signed URL.
export async function fetchHeldMediaUrl(media: HeldPostMedia): Promise<string | null> {
  if (media.mediaUrl) return media.mediaUrl;
  if (!media.storagePath || media.bucket !== "post-quarantine") return null;
  const { data, error } = await supabase.storage.from("post-quarantine").createSignedUrl(media.storagePath, 600);
  if (error) throw error;
  return data.signedUrl;
}

type CaptionFlagRow = {
  event_id: string;
  post_id: string | null;
  profile_id: string | null;
  username: string | null;
  caption_text: string | null;
  reason: string | null;
  created_at: string;
};

export async function fetchCaptionFlags(): Promise<CaptionFlagItem[]> {
  const { data, error } = await supabase.rpc("admin_list_caption_flags");
  if (error) throw error;

  return (data as CaptionFlagRow[]).map((row) => ({
    eventId: row.event_id,
    postId: row.post_id,
    profileId: row.profile_id,
    username: row.username,
    captionText: row.caption_text,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

type CsamHoldRow = {
  hold_id: string;
  post_id: string;
  profile_id: string;
  username: string | null;
  nca_report_status: "to_file" | "filed";
  nca_reference: string | null;
  created_at: string;
  filed_at: string | null;
};

export async function fetchCsamHolds(): Promise<CsamHoldItem[]> {
  const { data, error } = await supabase.rpc("admin_list_csam_holds");
  if (error) throw error;

  return (data as CsamHoldRow[]).map((row) => ({
    holdId: row.hold_id,
    postId: row.post_id,
    profileId: row.profile_id,
    username: row.username,
    ncaReportStatus: row.nca_report_status,
    ncaReference: row.nca_reference,
    createdAt: row.created_at,
    filedAt: row.filed_at,
  }));
}

export async function fetchHeldVideoPreview(postId: string): Promise<HeldVideoPreview> {
  const { data, error } = await supabase.functions.invoke("moderate-post", {
    body: { action: "video_preview", post_id: postId },
  });
  if (error || !data?.hls_url) throw error ?? new Error("No preview");
  return { hlsUrl: data.hls_url as string, thumbnailUrl: data.thumbnail_url as string };
}
