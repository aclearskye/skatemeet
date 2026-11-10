export type VerificationQueueItem = {
  requestId: string;
  spotId: string;
  spotName: string;
  spotPhotoUrl: string | null;
  requestedBy: string;
  requestedByUsername: string;
  requestedAt: string;
};

export type AdminEntityKind = "spot" | "store";

export type ReportResolution = "dismissed" | "content_removed";

export type PhotoReportItem = {
  photoId: string;
  entityKind: AdminEntityKind;
  mediaUrl: string;
  reportCount: number;
  reasons: string[];
  oldestReportAt: string;
};

export type ReviewReportItem = {
  reviewId: string;
  entityKind: AdminEntityKind;
  heading: string;
  comment: string;
  rating: number | null;
  reportCount: number;
  reasons: string[];
  oldestReportAt: string;
};

export type ProfileSearchResult = {
  profileId: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  isBanned: boolean;
};

export type BanHistoryItem = {
  banId: string;
  reason: string;
  bannedByUsername: string;
  bannedAt: string;
  unbannedAt: string | null;
  unbannedByUsername: string | null;
};

export type ProfileReportItem = {
  profileId: string;
  username: string;
  displayName: string | null;
  isBanned: boolean;
  reportCount: number;
  reasons: string[];
  oldestReportAt: string;
};

export type BanAppealItem = {
  appealId: string;
  profileId: string;
  username: string;
  banReason: string;
  bannedAt: string;
  testimony: string;
  submittedAt: string;
};

export type DeletionEligibleItem = {
  profileId: string;
  username: string;
  displayName: string | null;
  banReason: string;
  bannedAt: string;
  eligibleSince: string;
};

export type MessageReportItem = {
  reportId: string;
  // null once the message itself is gone (removed, or cleared by everyone).
  messageId: string | null;
  senderId: string;
  senderUsername: string;
  senderBanned: boolean;
  reason: string;
  details: string | null;
  createdAt: string;
};

export type MessageReportContext = {
  senderId: string;
  body: string | null;
  createdAt: string;
};

export type MessageReportDetail = {
  body: string | null;
  context: MessageReportContext[];
};

export type HeldPostMedia = {
  mediaId: string;
  position: number;
  bucket: string;
  storagePath: string | null;
  mediaUrl: string | null;
};

export type HeldPostItem = {
  postId: string;
  profileId: string;
  username: string;
  mediaType: "photo" | "video";
  caption: string | null;
  // 'nudity' | 'gore' | 'reports' | 'reported_child_sexual_abuse'
  holdReason: string | null;
  isUrgent: boolean;
  createdAt: string;
  reportCount: number;
  reportReasons: string[];
  media: HeldPostMedia[];
};

export type CaptionFlagItem = {
  eventId: string;
  postId: string | null;
  profileId: string | null;
  username: string | null;
  captionText: string | null;
  reason: string | null;
  createdAt: string;
};

export type CsamHoldItem = {
  holdId: string;
  postId: string;
  profileId: string;
  username: string | null;
  ncaReportStatus: "to_file" | "filed";
  ncaReference: string | null;
  createdAt: string;
  filedAt: string | null;
};

// Signed (1 hour) playback links for a held video -- it's still signed-only
// on Stream until approved.
export type HeldVideoPreview = {
  hlsUrl: string;
  thumbnailUrl: string;
};
