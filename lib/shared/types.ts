export type EntityPhoto = {
  photo_id: string;
  profile_id: string;
  media_url: string;
  upvote_count: number;
  downvote_count: number;
  is_hidden: boolean;
  created_at: string;
};

// Kept in sync with the CHECK constraint in
// supabase/migrations/20260908c_entity_photo_report_reasons.sql — the admin
// section will eventually filter reports by this `code`.
export const PHOTO_REPORT_REASONS = [
  { code: "nsfw", label: "Graphic / NSFW image" },
  { code: "outdated", label: "Outdated photo" },
  { code: "harassment", label: "Bullying or harassment" },
  { code: "consent", label: "I'm in this photo without consent" },
  { code: "spam", label: "Spam or irrelevant" },
  { code: "other", label: "Other" },
] as const;

export type PhotoReportReason = (typeof PHOTO_REPORT_REASONS)[number]["code"];
