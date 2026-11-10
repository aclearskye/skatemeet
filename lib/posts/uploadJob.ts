import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostError } from "./errors";
import { submitPost } from "./mutations";
import { uploadQuarantineFile } from "./uploadQuarantineFile";
import { uploadStreamVideo } from "./uploadStreamVideo";

// One in-flight post. Persisted so an upload interrupted by the app being
// killed resumes on next launch (lib/context/upload-queue-context.tsx).
// Jobs saved before video existed have no `kind` and are photo jobs.
export type PhotoUploadJob = {
  kind?: "photo";
  postId: string;
  files: { path: string; uri: string }[];
};

export type VideoUploadJob = {
  kind: "video";
  postId: string;
  uri: string;
  mimeType: string;
};

export type UploadJob = PhotoUploadJob | VideoUploadJob;

const STORAGE_KEY = "post_upload_jobs";

export async function loadPersistedJobs(): Promise<UploadJob[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePersistedJobs(jobs: UploadJob[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // Best effort -- the server-side sweeper still finishes complete uploads.
  }
}

export async function persistJob(job: UploadJob): Promise<void> {
  const jobs = await loadPersistedJobs();
  await savePersistedJobs([...jobs.filter((j) => j.postId !== job.postId), job]);
}

export async function forgetJob(postId: string): Promise<void> {
  const jobs = await loadPersistedJobs();
  await savePersistedJobs(jobs.filter((j) => j.postId !== postId));
}

function isAlreadyUploaded(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|Duplicate|409/i.test(message);
}

// Uploads every file (sequentially -- one background transfer at a time is
// kinder on mobile data), then hands the post to moderation. Overall
// progress is reported 0..1 across all files.
async function runPhotoUploadJob(
  job: PhotoUploadJob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const total = job.files.length;
  for (let i = 0; i < total; i++) {
    const file = job.files[i];
    try {
      await uploadQuarantineFile(file.path, file.uri, (f) => onProgress((i + f) / total), signal);
    } catch (error) {
      // A resumed job re-attempts files that already landed last time.
      if (!isAlreadyUploaded(error)) throw error;
      onProgress((i + 1) / total);
    }
  }
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  return submitPost(job.postId);
}

// A resumed video job restarts its upload with a fresh Stream URL (the old,
// unfinished one is discarded server-side). If the server has already moved
// the post on -- the webhook or sweeper got there first -- it's done.
async function runVideoUploadJob(
  job: VideoUploadJob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<string> {
  try {
    await uploadStreamVideo(job.postId, job.uri, job.mimeType, onProgress, signal);
  } catch (error) {
    if (error instanceof PostError && error.code === "POST_NOT_UPLOADING") return submitPost(job.postId);
    throw error;
  }
  if (signal?.aborted) throw new PostError("UPLOAD_CANCELLED");
  return submitPost(job.postId);
}

export function runUploadJob(job: UploadJob, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<string> {
  return job.kind === "video" ? runVideoUploadJob(job, onProgress, signal) : runPhotoUploadJob(job, onProgress, signal);
}
