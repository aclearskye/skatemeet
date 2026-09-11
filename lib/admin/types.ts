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
