import { supabase } from "@/lib/supabaseClient";
import type {
  AdminEntityKind,
  BanAppealItem,
  BanHistoryItem,
  DeletionEligibleItem,
  PhotoReportItem,
  ProfileReportItem,
  ProfileSearchResult,
  ReviewReportItem,
  VerificationQueueItem,
} from "./types";

type VerificationQueueRow = {
  request_id: string;
  spot_id: string;
  spot_name: string;
  spot_photo_url: string | null;
  requested_by: string;
  requested_by_username: string;
  requested_at: string;
};

export async function fetchVerificationQueue(): Promise<VerificationQueueItem[]> {
  const { data, error } = await supabase.rpc("admin_list_verification_requests");
  if (error) throw error;

  return (data as VerificationQueueRow[]).map((row) => ({
    requestId: row.request_id,
    spotId: row.spot_id,
    spotName: row.spot_name,
    spotPhotoUrl: row.spot_photo_url,
    requestedBy: row.requested_by,
    requestedByUsername: row.requested_by_username,
    requestedAt: row.requested_at,
  }));
}

type PhotoReportRow = {
  photo_id: string;
  entity_kind: AdminEntityKind;
  media_url: string;
  report_count: number;
  reasons: string[];
  oldest_report_at: string;
};

export async function fetchPhotoReports(): Promise<PhotoReportItem[]> {
  const { data, error } = await supabase.rpc("admin_list_photo_reports");
  if (error) throw error;

  return (data as PhotoReportRow[]).map((row) => ({
    photoId: row.photo_id,
    entityKind: row.entity_kind,
    mediaUrl: row.media_url,
    reportCount: row.report_count,
    reasons: row.reasons,
    oldestReportAt: row.oldest_report_at,
  }));
}

type ReviewReportRow = {
  review_id: string;
  entity_kind: AdminEntityKind;
  heading: string;
  comment: string;
  rating: number | null;
  report_count: number;
  reasons: string[];
  oldest_report_at: string;
};

export async function fetchReviewReports(): Promise<ReviewReportItem[]> {
  const { data, error } = await supabase.rpc("admin_list_review_reports");
  if (error) throw error;

  return (data as ReviewReportRow[]).map((row) => ({
    reviewId: row.review_id,
    entityKind: row.entity_kind,
    heading: row.heading,
    comment: row.comment,
    rating: row.rating,
    reportCount: row.report_count,
    reasons: row.reasons,
    oldestReportAt: row.oldest_report_at,
  }));
}

type ProfileSearchRow = {
  profile_id: string;
  username: string;
  display_name: string | null;
  is_admin: boolean;
  is_banned: boolean;
};

export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc("admin_search_profiles", { p_query: query });
  if (error) throw error;

  return (data as ProfileSearchRow[]).map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    isAdmin: row.is_admin,
    isBanned: row.is_banned,
  }));
}

type BanHistoryRow = {
  ban_id: string;
  reason: string;
  banned_by_username: string;
  banned_at: string;
  unbanned_at: string | null;
  unbanned_by_username: string | null;
};

export async function fetchBanHistory(profileId: string): Promise<BanHistoryItem[]> {
  const { data, error } = await supabase.rpc("admin_list_ban_history", { p_profile_id: profileId });
  if (error) throw error;

  return (data as BanHistoryRow[]).map((row) => ({
    banId: row.ban_id,
    reason: row.reason,
    bannedByUsername: row.banned_by_username,
    bannedAt: row.banned_at,
    unbannedAt: row.unbanned_at,
    unbannedByUsername: row.unbanned_by_username,
  }));
}

type ProfileReportRow = {
  profile_id: string;
  username: string;
  display_name: string | null;
  is_banned: boolean;
  report_count: number;
  reasons: string[];
  oldest_report_at: string;
};

export async function fetchProfileReports(): Promise<ProfileReportItem[]> {
  const { data, error } = await supabase.rpc("admin_list_profile_reports");
  if (error) throw error;

  return (data as ProfileReportRow[]).map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    isBanned: row.is_banned,
    reportCount: row.report_count,
    reasons: row.reasons,
    oldestReportAt: row.oldest_report_at,
  }));
}

type BanAppealRow = {
  appeal_id: string;
  profile_id: string;
  username: string;
  ban_reason: string;
  banned_at: string;
  testimony: string;
  submitted_at: string;
};

export async function fetchBanAppeals(): Promise<BanAppealItem[]> {
  const { data, error } = await supabase.rpc("admin_list_ban_appeals");
  if (error) throw error;

  return (data as BanAppealRow[]).map((row) => ({
    appealId: row.appeal_id,
    profileId: row.profile_id,
    username: row.username,
    banReason: row.ban_reason,
    bannedAt: row.banned_at,
    testimony: row.testimony,
    submittedAt: row.submitted_at,
  }));
}

type DeletionEligibleRow = {
  profile_id: string;
  username: string;
  display_name: string | null;
  ban_reason: string;
  banned_at: string;
  eligible_since: string;
};

export async function fetchDeletionEligible(): Promise<DeletionEligibleItem[]> {
  const { data, error } = await supabase.rpc("admin_list_deletion_eligible");
  if (error) throw error;

  return (data as DeletionEligibleRow[]).map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    banReason: row.ban_reason,
    bannedAt: row.banned_at,
    eligibleSince: row.eligible_since,
  }));
}
