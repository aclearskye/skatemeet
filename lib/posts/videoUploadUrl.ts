import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { PostError } from "./errors";

// A one-time Cloudflare Stream upload URL for this video draft, from the
// stream-video edge function. Asking again replaces an unfinished upload.
export async function requestVideoUploadUrl(postId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stream-video", {
    body: { action: "upload_url", post_id: postId },
  });
  if (error) {
    const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    const code = body?.error;
    if (code === "POST_NOT_FOUND" || code === "POST_NOT_UPLOADING") throw new PostError(code);
    throw new PostError("VIDEO_UNAVAILABLE");
  }
  if (!data?.upload_url) throw new PostError("VIDEO_UNAVAILABLE");
  return data.upload_url as string;
}
