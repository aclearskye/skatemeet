// Maps the RAISE EXCEPTION codes from the posts RPCs to user-facing copy,
// same shape as lib/admin/mutations.ts's AdminError.
export type PostErrorCode =
  | "BANNED"
  | "RATE_LIMITED"
  | "INVALID_MEDIA_COUNT"
  | "TOO_MANY_TAGS"
  | "CANNOT_TAG_SELF"
  | "CANNOT_TAG_PROFILE"
  | "UPLOAD_INCOMPLETE"
  | "POST_NOT_FOUND"
  | "POST_NOT_EDITABLE"
  | "PIN_LIMIT"
  | "TAG_NOT_FOUND"
  | "POST_NOT_UPLOADING"
  | "VIDEO_TOO_LONG"
  | "VIDEO_TOO_LARGE"
  | "VIDEO_UNAVAILABLE"
  | "UPLOAD_CANCELLED"
  | "UNKNOWN";

const MESSAGES: Record<PostErrorCode, string> = {
  BANNED: "Your account can't post right now.",
  RATE_LIMITED: "New accounts can post 3 times a day — try again later.",
  INVALID_MEDIA_COUNT: "Add 1–10 photos or one video.",
  TOO_MANY_TAGS: "You can tag up to 10 skaters.",
  CANNOT_TAG_SELF: "You can't tag yourself.",
  CANNOT_TAG_PROFILE: "One of those skaters can't be tagged.",
  UPLOAD_INCOMPLETE: "Your upload didn't finish — try again.",
  POST_NOT_FOUND: "This post isn't available.",
  POST_NOT_EDITABLE: "This post can't be edited.",
  PIN_LIMIT: "You can pin up to 3 posts.",
  TAG_NOT_FOUND: "That tag no longer exists.",
  POST_NOT_UPLOADING: "This post has already been uploaded.",
  VIDEO_TOO_LONG: "Videos can be up to 60 seconds — trim it and try again.",
  VIDEO_TOO_LARGE: "That video is over 200MB — try a shorter or lower-quality clip.",
  VIDEO_UNAVAILABLE: "Video uploads aren't available right now — try again later.",
  UPLOAD_CANCELLED: "Upload cancelled.",
  UNKNOWN: "Something went wrong — try again.",
};

export class PostError extends Error {
  code: PostErrorCode;
  constructor(code: PostErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

export function toPostError(error: { message: string }): PostError {
  const code = (Object.keys(MESSAGES) as PostErrorCode[]).find(
    (c) => c !== "UNKNOWN" && error.message.includes(c)
  );
  return new PostError(code ?? "UNKNOWN");
}
