import { supabase } from "@/lib/supabaseClient";
import { PostError } from "./errors";

// Web: a normal upload that continues while the tab stays open (the upload
// queue warns before unload). No byte-level progress from supabase-js, so
// progress jumps 0 -> 1 per file.
export async function uploadQuarantineFile(
  path: string,
  localUri: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  // supabase-js can't abort an upload in flight; cancelling stops before the
  // next file and the draft (with anything already uploaded) is deleted.
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  const response = await fetch(localUri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from("post-quarantine")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  onProgress(1);
}
