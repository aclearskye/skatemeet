import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabaseClient";
import { PostError } from "./errors";

// Native: a background URLSession (iOS) / background session (Android)
// upload to a Supabase signed upload URL, so the transfer keeps going when
// the app is backgrounded. The server-side sweeper (_sweep_posts) moves the
// post on to moderation even if the app never wakes to call submit_post.
// The web build resolves uploadQuarantineFile.web.ts instead.
export async function uploadQuarantineFile(
  path: string,
  localUri: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  const { data, error } = await supabase.storage.from("post-quarantine").createSignedUploadUrl(path);
  if (error) throw error;

  const task = FileSystem.createUploadTask(
    data.signedUrl,
    localUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend > 0) onProgress(totalBytesSent / totalBytesExpectedToSend);
    }
  );

  const cancel = () => task.cancelAsync();
  signal?.addEventListener("abort", cancel);
  const result = await task.uploadAsync().finally(() => signal?.removeEventListener("abort", cancel));
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result?.status ?? "no response"})`);
  }
  onProgress(1);
}
