import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  customerHost,
  deleteMp4Download,
  deleteVideo,
  getVideo,
  setRequireSignedUrls,
  signedToken,
  streamConfigured,
} from "../_shared/stream.ts";

// Content moderation for user posts (md/media_posts.md §2, §4). Two callers:
//
//  1. The database. _request_moderation() (pg_net) POSTs { post_id } with an
//     x-moderation-secret header whenever a post enters pending_moderation or
//     a live post gets a pending caption edit; _sweep_posts() retries. That
//     secret lives in Vault and is read back through the service-role-only
//     _moderation_webhook_secret() RPC, so there's no extra env var to sync.
//  2. Admins, with their own JWT: { action: "approve" | "csam" |
//     "video_preview", post_id }. These need Storage / Stream changes the
//     database can't make itself.
//
// Every photo and every video is scanned once. Media that already passed
// is never sent again (a caption fix, a retry, an admin approval), and
// viewing a post anywhere -- feed, profile, spot page, share link -- only
// reads the stored URL.
//
// Deployed with verify_jwt = false because the database caller has no JWT;
// every request is authenticated here instead.
//
// Nothing is ever published on an error: a failed or unparseable vendor
// response leaves the post pending, and the sweeper tries again.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── thresholds (md/media_posts.md §2 "Models and thresholds") ────────────
// Nudity: anything at very_suggestive or above is held, always urgent.
const NUDITY_HOLD_CLASSES = ["sexual_activity", "sexual_display", "erotica", "very_suggestive"];
const NUDITY_HOLD_SCORE = 0.5;
// Gore: only real gore is held. slightly_bloody / superficial_injury /
// unconscious are deliberately absent -- ordinary slams must pass.
const GORE_HOLD_CLASSES = ["very_bloody", "serious_injury", "body_organ", "corpse", "skull"];
const GORE_HOLD_SCORE = 0.6;
// Captions: hate speech and slurs only. Everyday swearing is fine.
const CAPTION_HATE_SCORE = 0.75;

const SIGHTENGINE = "https://api.sightengine.com/1.0";

type Decision = { decision: "pass" | "hold" | "reject" | "error"; reason: string | null; scores: unknown; urgent?: boolean };

type PostRow = {
  post_id: string;
  profile_id: string;
  media_type: "photo" | "video";
  caption: string | null;
  pending_caption: string | null;
  status: string;
};

type MediaRow = {
  media_id: string;
  position: number;
  media_type: "photo" | "video";
  bucket: string;
  storage_path: string | null;
  stream_uid: string | null;
  moderation_job_id: string | null;
  moderation_job_at: string | null;
};

function sightengineCredentials(): { user: string; secret: string } | null {
  const user = Deno.env.get("SIGHTENGINE_API_USER");
  const secret = Deno.env.get("SIGHTENGINE_API_SECRET");
  return user && secret ? { user, secret } : null;
}

function maxScore(obj: Record<string, unknown> | undefined, keys: string[]): number {
  if (!obj) return 0;
  return Math.max(0, ...keys.map((k) => (typeof obj[k] === "number" ? (obj[k] as number) : 0)));
}

type VisualScores = {
  nudity?: Record<string, unknown>;
  gore?: { classes?: Record<string, unknown>; type?: { fake?: number; animated?: number } };
};

// One image, or one video frame -- the same rules either way.
function judgeVisual(scores: VisualScores): "pass" | "nudity" | "gore" {
  if (maxScore(scores.nudity, NUDITY_HOLD_CLASSES) >= NUDITY_HOLD_SCORE) return "nudity";
  // gore.type splits real vs fake/animated; a missing type counts as real.
  const type = scores.gore?.type ?? {};
  const fakeOrAnimated = (type.fake ?? 0) + (type.animated ?? 0);
  if (maxScore(scores.gore?.classes, GORE_HOLD_CLASSES) >= GORE_HOLD_SCORE && fakeOrAnimated < 0.5) return "gore";
  return "pass";
}

function visualDecision(verdict: "pass" | "nudity" | "gore", scores: unknown): Decision {
  if (verdict === "nudity") return { decision: "hold", reason: "nudity", scores, urgent: true };
  if (verdict === "gore") return { decision: "hold", reason: "gore", scores };
  return { decision: "pass", reason: null, scores };
}

async function checkImage(url: string, creds: { user: string; secret: string }): Promise<Decision> {
  const params = new URLSearchParams({
    models: "nudity-2.1,gore-2.0",
    api_user: creds.user,
    api_secret: creds.secret,
    url,
  });
  const res = await fetch(`${SIGHTENGINE}/check.json?${params}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status !== "success" || !body.nudity || !body.gore) {
    return { decision: "error", reason: body?.error?.message ?? `http_${res.status}`, scores: body };
  }
  return visualDecision(judgeVisual(body), body);
}

// Videos are checked as stills: Stream renders a frame every 2s and each
// goes through the same image check as a photo. Works on Sightengine's
// free plan (its video endpoint doesn't), costs the same per second of
// video, and needs no MP4 copy or callback.
const VIDEO_FRAME_INTERVAL_SECONDS = 2;
// 60s cap / 2s, plus the first frame.
const MAX_VIDEO_FRAMES = 31;
const FRAME_CONCURRENCY = 5;
// Moderation can be requested twice at once (Stream webhook + sweeper).
// A run started within this window is assumed still going, so the frames
// aren't paid for twice.
const VIDEO_RUN_LOCK_MS = 3 * 60 * 1000;

function frameTimes(durationSeconds: number | undefined): number[] {
  const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : 0;
  const times: number[] = [];
  for (let t = 0; t < duration && times.length < MAX_VIDEO_FRAMES; t += VIDEO_FRAME_INTERVAL_SECONDS) times.push(t);
  // Always look at the last moment too, and at least one frame.
  const last = Math.max(0, Math.floor(duration) - 0.5);
  if (times.length === 0 || last - times[times.length - 1] >= 1) times.push(last);
  return times;
}

async function checkText(text: string, creds: { user: string; secret: string }): Promise<Decision> {
  const post = async (fields: Record<string, string>) => {
    const form = new FormData();
    for (const [k, v] of Object.entries({ text, lang: "en", api_user: creds.user, api_secret: creds.secret, ...fields })) {
      form.append(k, v);
    }
    const res = await fetch(`${SIGHTENGINE}/text/check.json`, { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    return res.ok && body?.status === "success" ? body : null;
  };

  // Rule-based: catches explicit slurs (plus the custom UK deny list, if one
  // is configured in the Sightengine dashboard) and extremism.
  const listId = Deno.env.get("SIGHTENGINE_TEXT_LIST_ID");
  const rules = await post({
    mode: "rules",
    categories: "profanity,extremism",
    ...(listId ? { list: listId } : {}),
  });
  // ML: catches hate that dodges keyword lists.
  const ml = await post({ mode: "ml", models: "general" });
  if (!rules || !ml) {
    return { decision: "error", reason: "text_api_error", scores: { text, rules, ml } };
  }

  type Match = { type?: string; intensity?: string };
  const profanity: Match[] = rules.profanity?.matches ?? [];
  const extremism: Match[] = rules.extremism?.matches ?? [];
  const customList: Match[] = rules.blacklist?.matches ?? [];
  const slur = profanity.some((m) => m.type === "discriminatory");
  const hateScore = typeof ml.moderation_classes?.discriminatory === "number" ? ml.moderation_classes.discriminatory : 0;

  const scores = { text, rules, ml };
  if (slur || customList.length > 0) return { decision: "reject", reason: "slur", scores };
  if (extremism.length > 0) return { decision: "reject", reason: "extremism", scores };
  if (hateScore >= CAPTION_HATE_SCORE) return { decision: "reject", reason: "hate_speech", scores };
  return { decision: "pass", reason: null, scores };
}

// Drops EXIF/XMP/IPTC (APP1, APP13) and comments from a JPEG, keeping JFIF
// (APP0), ICC colour profiles (APP2) and Adobe (APP14). Clients already
// re-encode, which strips metadata -- this is the server-side guarantee.
function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const keep = new Set([0xe0, 0xe2, 0xee]);
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    // Start of scan: everything after is image data.
    if (marker === 0xda) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
      return new Uint8Array(out);
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    if (!(isApp && !keep.has(marker)) && !isComment) {
      for (let j = i; j < end; j++) out.push(bytes[j]);
    }
    i = end;
  }
  return bytes;
}

async function recordEvent(
  service: SupabaseClient,
  post: PostRow,
  kind: "image" | "video" | "caption",
  result: Decision,
  mediaId: string | null = null,
) {
  await service.from("moderation_events").insert({
    post_id: post.post_id,
    profile_id: post.profile_id,
    media_id: mediaId,
    kind,
    decision: result.decision,
    reason: result.reason,
    scores: result.scores,
  });
}

// Copies every quarantined file into the public bucket (metadata stripped)
// and points the media rows at it. Done one file at a time to keep memory
// flat for 10-photo posts.
async function promoteMedia(service: SupabaseClient, media: MediaRow[]) {
  for (const m of media) {
    if (m.bucket !== "post-quarantine" || !m.storage_path) continue;
    const { data: blob, error: downloadError } = await service.storage.from("post-quarantine").download(m.storage_path);
    if (downloadError || !blob) throw new Error(`download failed: ${m.storage_path}`);
    const stripped = stripJpegMetadata(new Uint8Array(await blob.arrayBuffer()));

    const { error: uploadError } = await service.storage
      .from("post-media")
      .upload(m.storage_path, stripped, { contentType: "image/jpeg", upsert: true });
    if (uploadError) throw new Error(`upload failed: ${m.storage_path}`);

    const { data: pub } = service.storage.from("post-media").getPublicUrl(m.storage_path);
    await service.from("post_media").update({ bucket: "post-media", media_url: pub.publicUrl }).eq("media_id", m.media_id);
    await service.storage.from("post-quarantine").remove([m.storage_path]);
  }
}

// Makes a passed video public: signed-only off, any MP4 download removed
// (none are made now, but early uploads had one), and the HLS + thumbnail
// URLs stored for the viewer.
async function promoteVideo(service: SupabaseClient, m: MediaRow) {
  if (!m.stream_uid) throw new Error("video has no stream uid");
  const video = await setRequireSignedUrls(m.stream_uid, false);
  await deleteMp4Download(m.stream_uid).catch(() => {});
  const current = video?.playback?.hls ? video : await getVideo(m.stream_uid);
  if (!current?.playback?.hls) throw new Error("stream video has no playback url");
  await service
    .from("post_media")
    .update({
      media_url: current.playback.hls,
      thumbnail_url: current.thumbnail ?? `https://${customerHost(current)}/${m.stream_uid}/thumbnails/thumbnail.jpg`,
      duration_seconds: typeof current.duration === "number" && current.duration > 0 ? current.duration : undefined,
    })
    .eq("media_id", m.media_id);
}

async function promoteAll(service: SupabaseClient, post: PostRow, media: MediaRow[]) {
  if (post.media_type === "video") {
    for (const m of media) await promoteVideo(service, m);
  } else {
    await promoteMedia(service, media);
  }
}

async function loadPost(service: SupabaseClient, postId: string) {
  const { data: post } = await service
    .from("posts")
    .select("post_id, profile_id, media_type, caption, pending_caption, status")
    .eq("post_id", postId)
    .maybeSingle<PostRow>();
  const { data: media } = await service
    .from("post_media")
    .select("media_id, position, media_type, bucket, storage_path, stream_uid, moderation_job_id, moderation_job_at")
    .eq("post_id", postId)
    .order("position");
  return { post, media: (media ?? []) as MediaRow[] };
}

// A video post is requested several times while Stream processes it; its
// caption only needs checking once.
async function captionAlreadyPassed(service: SupabaseClient, postId: string, caption: string): Promise<boolean> {
  const { data } = await service
    .from("moderation_events")
    .select("scores")
    .eq("post_id", postId)
    .eq("kind", "caption")
    .eq("decision", "pass");
  return (data ?? []).some((r: { scores: { text?: string } | null }) => r.scores?.text === caption);
}

async function mediaAlreadyPassed(service: SupabaseClient, postId: string, kind: "image" | "video"): Promise<Set<string>> {
  const { data } = await service
    .from("moderation_events")
    .select("media_id")
    .eq("post_id", postId)
    .eq("kind", kind)
    .eq("decision", "pass");
  return new Set((data ?? []).map((r: { media_id: string }) => r.media_id));
}

// Video: once Stream has processed it, check stills across the whole clip
// through short-lived signed thumbnail URLs (the video stays signed-only
// until it passes). The worst frame decides; nudity outranks gore.
async function moderateVideo(service: SupabaseClient, post: PostRow, media: MediaRow[], creds: { user: string; secret: string }) {
  const m = media[0];
  if (!m?.stream_uid) return json({ error: "video not uploaded" }, 409);
  if (!streamConfigured()) return json({ error: "Cloudflare Stream not configured" }, 503);

  // Passed before (e.g. caption fixed afterwards): publish without rescanning.
  if ((await mediaAlreadyPassed(service, post.post_id, "video")).has(m.media_id)) {
    await promoteVideo(service, m);
    await service.rpc("moderation_publish_post", { p_post_id: post.post_id });
    return json({ published: true, rescanned: false });
  }

  const video = await getVideo(m.stream_uid);
  if (!video) return json({ error: "stream video missing" }, 502);
  if (video.status?.state === "error") {
    await service.rpc("stream_video_failed", {
      p_post_id: post.post_id,
      p_stream_uid: m.stream_uid,
      p_error: video.status.errReasonCode ?? video.status.errorReasonCode ?? "ERR_UNKNOWN",
    });
    return json({ failed: true });
  }
  // Not processed yet: the Stream webhook re-requests as soon as it is, and
  // the sweeper covers a missed webhook.
  if (!video.readyToStream) return json({ pending: "stream_processing" }, 202);

  // Claim the run (moderation_job_at doubles as the lock).
  const lockBefore = new Date(Date.now() - VIDEO_RUN_LOCK_MS).toISOString();
  const { data: claimed } = await service
    .from("post_media")
    .update({ moderation_job_at: new Date().toISOString() })
    .eq("media_id", m.media_id)
    .or(`moderation_job_at.is.null,moderation_job_at.lt."${lockBefore}"`)
    .select("media_id");
  if (!claimed?.length) return json({ pending: "video_check_running" }, 202);

  try {
    const token = await signedToken(m.stream_uid, { ttlSeconds: 30 * 60 });
    const host = customerHost(video);
    const times = frameTimes(video.duration);
    const frames: { time: number; scores: unknown }[] = [];
    let worst: Decision | null = null;

    for (let i = 0; i < times.length && !worst; i += FRAME_CONCURRENCY) {
      const batch = times.slice(i, i + FRAME_CONCURRENCY);
      const results = await Promise.all(
        batch.map((t) => checkImage(`https://${host}/${token}/thumbnails/thumbnail.jpg?time=${t}s&height=720`, creds)),
      );
      for (let k = 0; k < results.length; k++) {
        const result = results[k];
        frames.push({ time: batch[k], scores: result.scores });
        if (result.decision === "error") {
          await recordEvent(service, post, "video", { decision: "error", reason: result.reason, scores: { frames } }, m.media_id);
          return json({ error: result.reason }, 502);
        }
        if (result.decision === "hold" && (!worst || result.reason === "nudity")) worst = result;
      }
    }

    if (worst) {
      await recordEvent(service, post, "video", { ...worst, scores: { frames } }, m.media_id);
      await service.rpc("moderation_hold_post", {
        p_post_id: post.post_id,
        p_reason: worst.reason,
        p_urgent: worst.urgent === true,
      });
      return json({ media: "hold", reason: worst.reason });
    }

    await recordEvent(service, post, "video", { decision: "pass", reason: null, scores: { frames } }, m.media_id);
    await promoteVideo(service, m);
    await service.rpc("moderation_publish_post", { p_post_id: post.post_id });
    return json({ published: true, frames: frames.length });
  } finally {
    // Release the lock so a failed run can be retried by the sweeper.
    await service.from("post_media").update({ moderation_job_at: null }).eq("media_id", m.media_id);
  }
}

async function moderate(service: SupabaseClient, postId: string) {
  const { post, media } = await loadPost(service, postId);
  if (!post) return json({ skipped: "not_found" });

  const creds = sightengineCredentials();
  if (!creds) {
    await recordEvent(service, post, "caption", { decision: "error", reason: "missing_credentials", scores: null });
    return json({ error: "Sightengine credentials not configured" }, 503);
  }

  // Caption edit on a live post: text only; the old caption stays on failure.
  if (post.status === "published" && post.pending_caption) {
    const result = await checkText(post.pending_caption, creds);
    await recordEvent(service, post, "caption", result);
    if (result.decision === "error") return json({ error: result.reason }, 502);
    await service.rpc(result.decision === "pass" ? "moderation_apply_caption" : "moderation_reject_caption", {
      p_post_id: postId,
    });
    return json({ caption: result.decision });
  }

  if (post.status !== "pending_moderation") return json({ skipped: post.status });

  // Caption first: it's the cheapest check, and a failing caption blocks the
  // post (and flags it to admins via the reject event) regardless of media.
  if (post.caption && !(await captionAlreadyPassed(service, postId, post.caption))) {
    const result = await checkText(post.caption, creds);
    await recordEvent(service, post, "caption", result);
    if (result.decision === "error") return json({ error: result.reason }, 502);
    if (result.decision === "reject") {
      await service.rpc("moderation_reject_caption", { p_post_id: postId });
      return json({ caption: "reject" });
    }
  }

  if (post.media_type === "video") return await moderateVideo(service, post, media, creds);

  // Media that already passed (a post re-entering after a caption fix)
  // isn't re-scanned.
  const alreadyPassed = await mediaAlreadyPassed(service, postId, "image");

  for (const m of media) {
    if (alreadyPassed.has(m.media_id) || m.bucket !== "post-quarantine" || !m.storage_path) continue;
    const { data: signed } = await service.storage.from("post-quarantine").createSignedUrl(m.storage_path, 300);
    if (!signed) return json({ error: `missing file ${m.storage_path}` }, 502);

    const result = await checkImage(signed.signedUrl, creds);
    await recordEvent(service, post, "image", result, m.media_id);
    if (result.decision === "error") return json({ error: result.reason }, 502);
    if (result.decision === "hold") {
      await service.rpc("moderation_hold_post", {
        p_post_id: postId,
        p_reason: result.reason,
        p_urgent: result.urgent === true,
      });
      return json({ media: "hold", reason: result.reason });
    }
  }

  await promoteMedia(service, media);
  await service.rpc("moderation_publish_post", { p_post_id: postId });
  return json({ published: true });
}

async function adminApprove(service: SupabaseClient, postId: string, adminId: string) {
  const { post, media } = await loadPost(service, postId);
  if (!post || post.status !== "held") return json({ error: "Post isn't held" }, 409);

  await promoteAll(service, post, media);
  await service.rpc("moderation_publish_post", { p_post_id: postId });
  await service
    .from("post_reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: adminId, resolution: "dismissed" })
    .eq("post_id", postId)
    .is("resolved_at", null);
  await service.from("admin_audit_log").insert({
    admin_id: adminId,
    action: "post_approved",
    target_type: "post",
    target_id: postId,
  });
  return json({ approved: true });
}

// Moves every file into the locked evidence bucket before recording the
// hold, so nothing stays reachable from a public or admin-readable bucket.
async function adminCsamHold(service: SupabaseClient, postId: string, adminId: string) {
  const { post, media } = await loadPost(service, postId);
  if (!post) return json({ error: "Post not found" }, 404);

  const evidencePaths: string[] = [];
  // Video evidence stays on Stream, locked back to signed-only with no
  // download; the 'moderation-evidence' label set by the hold keeps it out
  // of cleanup. Recorded as stream:<uid> for the NCA report.
  for (const m of media) {
    if (!m.stream_uid) continue;
    await setRequireSignedUrls(m.stream_uid, true);
    await deleteMp4Download(m.stream_uid).catch(() => {});
    evidencePaths.push(`stream:${m.stream_uid}`);
  }
  for (const m of media) {
    if (!m.storage_path || m.bucket === "moderation-evidence") continue;
    const evidencePath = `${post.profile_id}/${postId}/${m.position}.jpg`;
    const { data: blob, error } = await service.storage.from(m.bucket).download(m.storage_path);
    if (error || !blob) return json({ error: `evidence download failed: ${m.storage_path}` }, 502);
    const { error: uploadError } = await service.storage
      .from("moderation-evidence")
      .upload(evidencePath, blob, { contentType: "image/jpeg", upsert: true });
    if (uploadError) return json({ error: "evidence upload failed" }, 502);
    await service.storage.from(m.bucket).remove([m.storage_path]);
    await service.from("post_media").update({ storage_path: evidencePath }).eq("media_id", m.media_id);
    evidencePaths.push(evidencePath);
  }

  const { data: holdId, error } = await service.rpc("moderation_record_csam_hold", {
    p_post_id: postId,
    p_admin_id: adminId,
    p_evidence_paths: evidencePaths,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ hold_id: holdId });
}

// Signed playback links for an admin reviewing a held video (it's still
// signed-only, so the plain URLs don't play).
async function adminVideoPreview(service: SupabaseClient, postId: string) {
  const { media } = await loadPost(service, postId);
  const m = media.find((row) => row.stream_uid);
  if (!m?.stream_uid) return json({ error: "Not a video post" }, 409);
  const video = await getVideo(m.stream_uid);
  if (!video?.readyToStream) return json({ error: "Video is still processing" }, 409);
  const token = await signedToken(m.stream_uid, { ttlSeconds: 60 * 60 });
  const host = customerHost(video);
  return json({
    hls_url: `https://${host}/${token}/manifest/video.m3u8`,
    thumbnail_url: `https://${host}/${token}/thumbnails/thumbnail.jpg`,
  });
}

// Removes queued files (deleted / removed posts, abandoned drafts, deleted
// accounts) from Storage, and queued videos from Stream. Called by
// _request_media_cleanup() on a cron.
const CLEANUP_BATCH = 200;

async function drainMediaCleanup(service: SupabaseClient) {
  const { data: rows } = await service
    .from("media_cleanup_queue")
    .select("cleanup_id, bucket, path")
    .order("created_at")
    .limit(CLEANUP_BATCH);
  const queue = (rows ?? []) as { cleanup_id: string; bucket: string; path: string }[];
  const done: string[] = [];

  const byBucket = new Map<string, typeof queue>();
  for (const row of queue) {
    if (row.bucket === "moderation-evidence") continue; // never, as a safety net
    if (row.bucket === "stream") {
      if (!streamConfigured()) continue;
      try {
        await deleteVideo(row.path);
        done.push(row.cleanup_id);
      } catch {
        // Left queued for the next run.
      }
      continue;
    }
    byBucket.set(row.bucket, [...(byBucket.get(row.bucket) ?? []), row]);
  }
  for (const [bucket, items] of byBucket) {
    // Removing a path that's already gone isn't an error, so retries are safe.
    const { error } = await service.storage.from(bucket).remove(items.map((i) => i.path));
    if (!error) done.push(...items.map((i) => i.cleanup_id));
  }
  if (done.length) await service.from("media_cleanup_queue").delete().in("cleanup_id", done);
  return json({ removed: done.length });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const postId = typeof body.post_id === "string" ? body.post_id : null;

    const webhookSecret = req.headers.get("x-moderation-secret");
    if (webhookSecret) {
      const { data: expected } = await service.rpc("_moderation_webhook_secret");
      if (!expected || webhookSecret !== expected) return json({ error: "Forbidden" }, 403);
      if (body.action === "drain_cleanup") return await drainMediaCleanup(service);
      if (!postId) return json({ error: "post_id required" }, 400);
      return await moderate(service, postId);
    }
    if (!postId) return json({ error: "post_id required" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) return json({ error: "Not authenticated" }, 401);

    const { data: profile } = await service
      .from("profiles")
      .select("is_admin")
      .eq("profile_id", userData.user.id)
      .maybeSingle<{ is_admin: boolean }>();
    if (!profile?.is_admin) return json({ error: "Forbidden" }, 403);

    if (body.action === "approve") return await adminApprove(service, postId, userData.user.id);
    if (body.action === "csam") return await adminCsamHold(service, postId, userData.user.id);
    if (body.action === "video_preview") return await adminVideoPreview(service, postId);
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
