import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { notifyIfBackgrounded } from "@/lib/notifications/localNotification";
import { registerForPushNotifications } from "@/lib/notifications/pushRegistration";
import { PostError } from "@/lib/posts/errors";
import { createPostDraft, deletePost, type CreatePostDraftInput } from "@/lib/posts/mutations";
import { forgetJob, loadPersistedJobs, persistJob, runUploadJob, type UploadJob } from "@/lib/posts/uploadJob";
import type { PickedPhoto } from "@/lib/posts/preparePhoto";
import type { PickedVideo } from "@/lib/posts/prepareVideo";
import { fetchPost } from "@/lib/posts/queries";
import type { PostStatus } from "@/lib/posts/types";
import { queryKeys } from "@/utils/queryKeys";

export type UploadState = "uploading" | "moderating" | "failed";

export type UploadItem = {
  postId: string;
  state: UploadState;
  progress: number;
  error: string | null;
  // Hidden from the progress card by the user; the upload and the outcome
  // toast/notification carry on as normal.
  hidden: boolean;
};

type UploadQueueContextType = {
  uploads: UploadItem[];
  // Resolves once the draft exists (so the composer can close); the upload
  // itself carries on in the background.
  startPhotoPost: (input: Omit<CreatePostDraftInput, "mediaType" | "mediaCount">, photos: PickedPhoto[]) => Promise<void>;
  startVideoPost: (input: Omit<CreatePostDraftInput, "mediaType" | "mediaCount">, video: PickedVideo) => Promise<void>;
  retry: (postId: string) => void;
  // Hides the progress card without stopping anything.
  hide: (postId: string) => void;
  // Stops the upload (or the wait for moderation) and deletes the draft, so
  // nothing half-uploaded is left on the server. Also what DISMISS does for
  // a failed upload.
  cancel: (postId: string) => void;
};

const UploadQueueContext = createContext<UploadQueueContextType>({
  uploads: [],
  startPhotoPost: async () => {},
  startVideoPost: async () => {},
  retry: () => {},
  hide: () => {},
  cancel: () => {},
});

// Moderation is usually seconds; past this the post is simply "in review"
// and the push notification (or the profile's pending list) takes over.
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 2 * 60 * 1000;
// Video waits on Stream processing and an async frame-by-frame scan.
const VIDEO_POLL_TIMEOUT_MS = 6 * 60 * 1000;

type Outcome = {
  message: string;
  variant: "success" | "info" | "danger";
  // For the background notification; source matches the server's push.
  source: string;
  title: string;
  body: string;
};

const OUTCOMES: Partial<Record<PostStatus, Outcome>> = {
  published: {
    message: "YOUR POST IS UPLOADED",
    variant: "success",
    source: "post_published",
    title: "YOUR POST IS LIVE",
    body: "TAP TO VIEW IT.",
  },
  held: {
    message: "YOUR POST IS UNDER REVIEW",
    variant: "info",
    source: "post_held",
    title: "YOUR POST IS UNDER REVIEW",
    body: "AN ADMIN WILL TAKE A LOOK BEFORE IT GOES LIVE.",
  },
  caption_rejected: {
    message: "EDIT YOUR CAPTION TO POST IT",
    variant: "danger",
    source: "post_caption_rejected",
    title: "YOUR POST NEEDS AN EDIT",
    body: "EDIT YOUR CAPTION TO POST IT.",
  },
};

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const jobsRef = useRef(new Map<string, UploadJob>());
  const abortersRef = useRef(new Map<string, AbortController>());
  const userId = session?.user.id ?? null;

  const patch = useCallback((postId: string, changes: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.postId === postId ? { ...u, ...changes } : u)));
  }, []);

  const remove = useCallback((postId: string) => {
    setUploads((prev) => prev.filter((u) => u.postId !== postId));
    jobsRef.current.delete(postId);
    abortersRef.current.delete(postId);
  }, []);

  const awaitModeration = useCallback(
    async (postId: string, isVideo: boolean) => {
      const deadline = Date.now() + (isVideo ? VIDEO_POLL_TIMEOUT_MS : POLL_TIMEOUT_MS);
      let settled = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        // Cancelled (cancel() removed it): stop polling quietly.
        if (!abortersRef.current.has(postId)) return;
        // undefined = the check failed (try again); null = the post is gone,
        // which for a video means Stream rejected it and the draft was
        // deleted (the inbox notification says why).
        const post = await fetchPost(postId).catch(() => undefined);
        if (post === null) {
          settled = true;
          if (isVideo) {
            showToast({ message: "YOUR VIDEO DIDN'T UPLOAD — CHECK YOUR NOTIFICATIONS", variant: "danger" });
            notifyIfBackgrounded({
              title: "YOUR VIDEO DIDN'T UPLOAD",
              body: "TAP TO SEE WHY.",
              data: { source: "post_video_failed" },
            });
          }
          break;
        }
        const outcome = post ? OUTCOMES[post.status] : undefined;
        if (outcome) {
          settled = true;
          showToast({ message: outcome.message, variant: outcome.variant });
          notifyIfBackgrounded({
            title: outcome.title,
            body: outcome.body,
            data: { source: outcome.source, post_id: postId },
          });
          break;
        }
      }
      // Still checking after the wait: the server finishes on its own and
      // the inbox (and push, where set up) says how it went.
      if (!settled && abortersRef.current.has(postId)) {
        showToast({ message: "STILL CHECKING YOUR POST — WE'LL NOTIFY YOU", variant: "info" });
      }
      remove(postId);
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profilePosts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.profilePostCount(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.myPendingPosts(userId) });
        // Own posts show in Global too: re-pin the feed's as-of time so a
        // newly live post lands at the top.
        queryClient.invalidateQueries({ queryKey: queryKeys.feedAsOfBase });
      }
    },
    [queryClient, remove, showToast, userId]
  );

  const run = useCallback(
    async (job: UploadJob) => {
      jobsRef.current.set(job.postId, job);
      const aborter = new AbortController();
      abortersRef.current.set(job.postId, aborter);
      setUploads((prev) => [
        ...prev.filter((u) => u.postId !== job.postId),
        { postId: job.postId, state: "uploading", progress: 0, error: null, hidden: false },
      ]);
      try {
        await runUploadJob(job, (progress) => patch(job.postId, { progress }), aborter.signal);
        await forgetJob(job.postId);
        patch(job.postId, { state: "moderating", progress: 1 });
        await awaitModeration(job.postId, job.kind === "video");
      } catch (error) {
        if (aborter.signal.aborted) return; // cancel() already cleaned up
        if (error instanceof PostError && error.code === "POST_NOT_FOUND") {
          await forgetJob(job.postId);
          remove(job.postId);
          return;
        }
        // A failure always shows its card again, even if it was hidden.
        patch(job.postId, {
          state: "failed",
          error: error instanceof Error ? error.message : "Upload failed",
          hidden: false,
        });
        notifyIfBackgrounded({
          title: "YOUR POST DIDN'T UPLOAD",
          body: "OPEN SKATEMEET TO RETRY.",
          data: { source: "post_upload_failed" },
        });
      }
    },
    [awaitModeration, patch, remove]
  );

  // Resume anything interrupted by the app being killed.
  useEffect(() => {
    if (!userId) return;
    loadPersistedJobs().then((jobs) => jobs.forEach((job) => run(job)));
  }, [userId, run]);

  // Web uploads stop if the tab closes.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const active = uploads.some((u) => u.state === "uploading");
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploads]);

  const startPhotoPost = useCallback<UploadQueueContextType["startPhotoPost"]>(
    async (input, photos) => {
      const draft = await createPostDraft({ ...input, mediaType: "photo", mediaCount: photos.length });
      // First post is when we ask for push permission ("your post is live").
      registerForPushNotifications();
      const job: UploadJob = {
        postId: draft.postId,
        files: draft.uploadPaths.map((path, i) => ({ path, uri: photos[i].uri })),
      };
      await persistJob(job);
      run(job);
    },
    [run]
  );

  const startVideoPost = useCallback<UploadQueueContextType["startVideoPost"]>(
    async (input, video) => {
      const draft = await createPostDraft({ ...input, mediaType: "video", mediaCount: 1 });
      registerForPushNotifications();
      const job: UploadJob = { kind: "video", postId: draft.postId, uri: video.uri, mimeType: video.mimeType };
      await persistJob(job);
      run(job);
    },
    [run]
  );

  const retry = useCallback(
    (postId: string) => {
      const job = jobsRef.current.get(postId);
      if (job) run(job);
    },
    [run]
  );

  const hide = useCallback((postId: string) => patch(postId, { hidden: true }), [patch]);

  const cancel = useCallback(
    async (postId: string) => {
      abortersRef.current.get(postId)?.abort();
      forgetJob(postId);
      remove(postId);
      // Stream's webhook can finish a video upload server-side before the
      // app hears back, so the post may already be live (or in review). A
      // cancel never deletes that -- it's deleted from the profile instead.
      // A failed check (offline) falls through to the delete, which only
      // removes what the server still lets the author remove.
      const post = await fetchPost(postId).catch(() => undefined);
      if (post && (post.status === "published" || post.status === "held")) {
        showToast({ message: "YOUR POST IS ALREADY UP — DELETE IT FROM YOUR PROFILE", variant: "info" });
      } else {
        // Deleting the draft queues its files (Storage or Stream) for cleanup.
        // If this fails (offline), the sweeper deletes abandoned drafts after
        // 24h.
        await deletePost(postId).catch(() => {});
        showToast({ message: "UPLOAD CANCELLED", variant: "info" });
      }
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profilePosts(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.profilePostCount(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.myPendingPosts(userId) });
      }
    },
    [queryClient, remove, showToast, userId]
  );

  return (
    <UploadQueueContext.Provider value={{ uploads, startPhotoPost, startVideoPost, retry, hide, cancel }}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export const useUploadQueue = () => useContext(UploadQueueContext);
