import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDirectUpload, deleteVideo, streamConfigured, verifyStreamWebhook } from "../_shared/stream.ts";

// Cloudflare Stream glue for video posts (md/media_posts.md §3, Phase 3).
// Two callers:
//
//  1. The app, with the author's JWT: { action: "upload_url", post_id } for
//     a one-time direct-upload URL on their own 'uploading' video draft.
//     Asking again (a retry) replaces the previous, unfinished upload.
//  2. Cloudflare's webhook, signed with STREAM_WEBHOOK_SECRET, when Stream
//     finishes processing a video (ready) or gives up on it (error).
//
// Deployed with verify_jwt = false because the webhook has no JWT; the app
// path authenticates the caller itself.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const rawBody = await req.text();

    // ── Stream webhook ────────────────────────────────────────────────────
    const signature = req.headers.get("Webhook-Signature");
    if (signature) {
      const secret = Deno.env.get("STREAM_WEBHOOK_SECRET");
      if (!secret || !(await verifyStreamWebhook(rawBody, signature, secret))) {
        return json({ error: "Forbidden" }, 403);
      }
      const event = JSON.parse(rawBody);
      const uid: string | undefined = event?.uid;
      const postId: string | undefined = event?.meta?.post_id;
      if (!uid || !postId) return json({ skipped: "no post" });

      const state = event?.status?.state;
      if (state === "ready" && event.readyToStream) {
        const { error } = await service.rpc("stream_video_ready", {
          p_post_id: postId,
          p_stream_uid: uid,
          p_duration: typeof event.duration === "number" ? event.duration : null,
          p_width: event.input?.width ?? null,
          p_height: event.input?.height ?? null,
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ready: true });
      }
      if (state === "error") {
        const { error } = await service.rpc("stream_video_failed", {
          p_post_id: postId,
          p_stream_uid: uid,
          p_error: event.status?.errReasonCode ?? event.status?.errorReasonCode ?? "ERR_UNKNOWN",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ failed: true });
      }
      return json({ skipped: state ?? "unknown" });
    }

    // ── App: upload URL ──────────────────────────────────────────────────
    const body = rawBody ? JSON.parse(rawBody) : {};
    if (body.action !== "upload_url" || typeof body.post_id !== "string") {
      return json({ error: "Unknown action" }, 400);
    }
    if (!streamConfigured()) return json({ error: "Video uploads aren't set up yet" }, 503);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Not authenticated" }, 401);

    const { data: post } = await service
      .from("posts")
      .select("post_id, profile_id, media_type, status")
      .eq("post_id", body.post_id)
      .maybeSingle<{ post_id: string; profile_id: string; media_type: string; status: string }>();
    if (!post || post.profile_id !== userId) return json({ error: "POST_NOT_FOUND" }, 404);
    if (post.media_type !== "video" || post.status !== "uploading") {
      return json({ error: "POST_NOT_UPLOADING" }, 409);
    }

    const { data: media } = await service
      .from("post_media")
      .select("media_id, stream_uid")
      .eq("post_id", post.post_id)
      .maybeSingle<{ media_id: string; stream_uid: string | null }>();
    if (!media) return json({ error: "POST_NOT_FOUND" }, 404);

    const upload = await createDirectUpload({ postId: post.post_id, creator: userId });
    const { error: updateError } = await service
      .from("post_media")
      .update({ stream_uid: upload.uid, bucket: "stream" })
      .eq("media_id", media.media_id);
    if (updateError) {
      await deleteVideo(upload.uid).catch(() => {});
      return json({ error: updateError.message }, 500);
    }
    // The previous attempt's upload never finished; don't leave it on Stream.
    if (media.stream_uid && media.stream_uid !== upload.uid) {
      await deleteVideo(media.stream_uid).catch(() => {});
    }

    return json({ upload_url: upload.uploadURL, uid: upload.uid });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
