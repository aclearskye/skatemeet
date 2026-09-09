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

// Kept in sync with the CHECK constraint in
// supabase/migrations/20260909b_review_reports.sql.
export const REVIEW_REPORT_REASONS = [
  { code: "spam", label: "Spam or irrelevant" },
  { code: "harassment", label: "Bullying or harassment" },
  { code: "offensive", label: "Offensive language" },
  { code: "inaccurate", label: "Factually inaccurate" },
  { code: "other", label: "Other" },
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number]["code"];

export type ReportReason = { code: string; label: string };

// Kept in sync with the CHECK constraint in
// supabase/migrations/20260909c_entity_metadata.sql.
export const FACILITIES = [
  "restrooms",
  "water_fountain",
  "seating",
  "shade",
  "bike_racks",
  "vending",
  "trash_bins",
  "first_aid",
] as const;

export type Facility = (typeof FACILITIES)[number];

export const FACILITY_LABELS: Record<Facility, string> = {
  restrooms: "Restrooms",
  water_fountain: "Water fountain",
  seating: "Seating",
  shade: "Shade",
  bike_racks: "Bike racks",
  vending: "Vending",
  trash_bins: "Trash bins",
  first_aid: "First aid",
};

export const PARKING_OPTIONS = ["none", "street", "lot", "garage"] as const;
export type ParkingType = (typeof PARKING_OPTIONS)[number];

export const PARKING_LABELS: Record<ParkingType, string> = {
  none: "No parking",
  street: "Street parking",
  lot: "Parking lot",
  garage: "Parking garage",
};

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type WeekdayHours = { closed: boolean; open: string | null; close: string | null };
export type OpeningHours = Record<Weekday, WeekdayHours>;

export type EntityMetadataBase = {
  metadata_id: string;
  osm_place_id: string | null;
  opening_hours: OpeningHours | null;
  facilities: Facility[];
  parking: ParkingType | null;
  pet_friendly: boolean | null;
  paid: boolean | null;
  well_lit: boolean | null;
  last_updated_by: string | null;
  updated_at: string;
};

export type UpsertMetadataPayload = {
  opening_hours: OpeningHours | null;
  facilities: Facility[];
  parking: ParkingType | null;
  pet_friendly: boolean | null;
  paid: boolean | null;
  well_lit: boolean | null;
};

export type ReviewInteractions = {
  currentUserId: string | null;
  reviewVotes: Record<string, boolean>;
  reportStatuses: Record<string, boolean>;
  onUpvote: (reviewId: string) => void;
  onReport: (reviewId: string, reason: ReviewReportReason) => void;
  onDelete: (reviewId: string) => void;
};
