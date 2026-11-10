import { PostError } from "./errors";
import { requestVideoUploadUrl } from "./videoUploadUrl";

// Web: an XHR multipart POST to Cloudflare Stream, for real byte progress
// (fetch has none for uploads). Continues while the tab stays open -- the
// upload queue warns before unload.
export async function uploadStreamVideo(
  postId: string,
  localUri: string,
  mimeType: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const uploadUrl = await requestVideoUploadUrl(postId);
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  const blob = await (await fetch(localUri)).blob();
  const form = new FormData();
  form.append("file", blob, `${postId}.${mimeType.split("/")[1] ?? "mp4"}`);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort);
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.onabort = () => reject(new PostError("UPLOAD_CANCELLED"));
    xhr.open("POST", uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed (network)"));
    xhr.send(form);
  });
  onProgress(1);
}
