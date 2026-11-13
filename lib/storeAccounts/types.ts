// Store accounts (docs/ACCOUNT_TYPES.md, "Store"). A Store account claims one
// store entity, either OSM (osmPlaceId) or user-created (storeId), and only
// becomes its owner once an admin approves the claim.

export const STORE_CLAIM_EVIDENCE_BUCKET = "store-claim-evidence";
export const STORE_IMAGES_BUCKET = "store-images";
export const MAX_CLAIM_EVIDENCE_FILES = 5;
export const MAX_CLAIM_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const CLAIM_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];

export type StoreClaimStatus = "draft" | "pending" | "approved" | "rejected" | "revoked";
export type StoreClaimKind = "claim" | "dispute";

export type StoreBusinessDetails = {
  legalName: string;
  registrationNumber: string;
  contactName: string;
  contactRole: string;
};

export type StorePublicDetails = {
  publicPhone: string | null;
  publicEmail: string | null;
  logoPath: string | null;
  coverPath: string | null;
};

export type ClaimedStoreSummary = {
  name: string;
  address: string;
  website: string | null;
  createdByMe: boolean;
};

export type StoreClaim = {
  claimId: string;
  status: StoreClaimStatus;
  kind: StoreClaimKind;
  storeId: string | null;
  osmPlaceId: string | null;
  evidencePaths: string[];
  applicantNote: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  store: ClaimedStoreSummary | null;
};

export type StoreOnboardingState = {
  business: StoreBusinessDetails | null;
  publicDetails: StorePublicDetails | null;
  claim: StoreClaim | null;
};

export type ClaimableStore = {
  storeId: string | null;
  osmPlaceId: string | null;
  name: string;
  address: string;
  website: string | null;
  isOwned: boolean;
};

export type SaveStoreDetailsPayload = StoreBusinessDetails & StorePublicDetails;

export type NewClaimStorePayload = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  website: string;
  phone: string;
};

export type PickedEvidenceFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
};

// Which part of onboarding the Store dashboard shows, derived from the
// server state so a reload always lands in the right place.
export type StoreOnboardingStep = "details" | "store" | "photos" | "proof" | "status";

// Logo and cover are optional, so the photos step only comes up by itself
// while neither is set and the owner hasn't skipped it (`skippedPhotos`,
// held by the dashboard for the session).
export function currentOnboardingStep(state: StoreOnboardingState, skippedPhotos = false): StoreOnboardingStep {
  if (!state.business) return "details";
  const claim = state.claim;
  if (!claim || claim.status === "rejected" || claim.status === "revoked") {
    return claim ? "status" : "store";
  }
  if (claim.status === "draft") {
    if (!claim.store) return "store";
    const hasPhotos = Boolean(state.publicDetails?.logoPath || state.publicDetails?.coverPath);
    return hasPhotos || skippedPhotos ? "proof" : "photos";
  }
  return "status";
}

export class StoreAccountError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "StoreAccountError";
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_STORE_ACCOUNT: "This isn't a business account.",
  BANNED: "This account is suspended.",
  ALREADY_OWNS_STORE: "This account already owns a store.",
  CLAIM_PENDING: "Your claim is under review. Withdraw it first to make changes.",
  CLAIM_LOCKED: "Your claim is under review. Withdraw it first to make changes.",
  STORE_NOT_FOUND: "That store couldn't be found.",
  INVALID_NAME: "Enter the store's name (2–120 characters).",
  INVALID_LOCATION: "Pick the store's address from the search results.",
  INVALID_IMAGE_PATH: "That image upload didn't work. Try again.",
  NO_DRAFT_CLAIM: "Choose your store first.",
  BUSINESS_DETAILS_MISSING: "Add your business details first.",
  EVIDENCE_REQUIRED: `Add between 1 and ${MAX_CLAIM_EVIDENCE_FILES} proof documents.`,
  EVIDENCE_NOT_FOUND: "One of your proof documents didn't upload. Remove it and try again.",
  NO_PENDING_CLAIM: "There's no claim under review.",
  CLAIM_ALREADY_LIVE: "You already have a claim in progress.",
  NO_PREVIOUS_CLAIM: "Choose your store to start a claim.",
};

export function toStoreAccountError(error: { message?: string; code?: string }): StoreAccountError {
  const raw = error.message ?? "";
  const code = Object.keys(ERROR_MESSAGES).find((key) => raw.includes(key));
  if (code) return new StoreAccountError(code, ERROR_MESSAGES[code]);
  if (error.code === "23514") {
    return new StoreAccountError("INVALID_INPUT", "Some details are too short or too long. Check each field.");
  }
  return new StoreAccountError("UNKNOWN", "Something went wrong. Try again.");
}
