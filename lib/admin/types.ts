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

// 'user': reported by a member. 'filter': refused before it was sent.
// 'scan': sent, then hidden by the automatic scan.
export type SpotChatReportSource = "user" | "filter" | "scan";

export type SpotChatReportItem = {
  reportId: string;
  source: SpotChatReportSource;
  // null for filter reports (never sent) and once the message is removed.
  messageId: string | null;
  messageHeld: boolean;
  spotName: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string | null;
  senderBanned: boolean;
  reason: string;
  details: string | null;
  // Repeat filter hits from the same sender in the same room.
  hitCount: number;
  isUrgent: boolean;
  createdAt: string;
  lastHitAt: string;
};

export type SpotChatReportContext = {
  senderId: string;
  senderUsername: string | null;
  body: string | null;
  createdAt: string;
};

export type SpotChatReportDetail = {
  body: string | null;
  context: SpotChatReportContext[];
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
