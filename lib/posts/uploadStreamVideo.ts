import * as FileSystem from "expo-file-system/legacy";
import { PostError } from "./errors";
import { requestVideoUploadUrl } from "./videoUploadUrl";

// How long to wait for Stream's HTTP response once every byte has gone out.
// On Android the upload task can report 100% and then never resolve even
// though Stream received and processed the file (its "ready" webhook fires),
// which used to leave the post stuck at "Uploading… 100%". After this grace
// period the job moves on: submit_post is safe to call early (moderation
// waits for Stream's readyToStream), and the webhook moves the post on
// regardless.
const RESPONSE_GRACE_MS = 8000;

// Native: a background multipart POST straight to Cloudflare Stream, so the
// transfer keeps going when the app is backgrounded. If the app never wakes
// to call submit_post, Stream's webhook moves the post on to moderation.
// The web build resolves uploadStreamVideo.web.ts instead.
export async function uploadStreamVideo(
  postId: string,
  localUri: string,
  mimeType: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const uploadUrl = await requestVideoUploadUrl(postId);
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");

  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let resolveSent: () => void = () => {};
  const sentAndWaited = new Promise<"sent">((resolve) => {
    resolveSent = () => resolve("sent");
  });

  const task = FileSystem.createUploadTask(
    uploadUrl,
    localUri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType,
      sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend <= 0) return;
      onProgress(totalBytesSent / totalBytesExpectedToSend);
      if (totalBytesSent >= totalBytesExpectedToSend && graceTimer == null) {
        graceTimer = setTimeout(resolveSent, RESPONSE_GRACE_MS);
      }
    }
  );

  const cancel = () => task.cancelAsync();
  signal?.addEventListener("abort", cancel);
  const upload = task.uploadAsync();
  // If the grace period wins, a late rejection here has nothing to report to.
  upload.catch(() => {});

  try {
    const result = await Promise.race([upload, sentAndWaited]);
    if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
    if (result !== "sent" && (!result || result.status < 200 || result.status >= 300)) {
      throw new Error(`Upload failed (${result?.status ?? "no response"})`);
    }
  } finally {
    if (graceTimer != null) clearTimeout(graceTimer);
    signal?.removeEventListener("abort", cancel);
  }
  onProgress(1);
}
