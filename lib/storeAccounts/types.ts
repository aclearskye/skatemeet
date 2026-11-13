// Store accounts (docs/ACCOUNT_TYPES.md, "Store"). A Store account claims one
// store entity, either OSM (osmPlaceId) or user-created (storeId), and only
// becomes its owner once an admin approves the claim.

import type { Profile } from "@/lib/context/use-auth-context";

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

// An approved Store account. The server sets onboarding_completed when a
// claim is approved and clears it if the claim is revoked; it only decides
// routing, since every store RPC checks approval itself.
export function isApprovedStoreProfile(profile: Profile | null | undefined): boolean {
  return profile?.account_type === "store" && profile.onboarding_completed;
}

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

// The official layer of a claimed store's page (get_store_page). Null when
// nobody owns the store, and the page is the plain community listing.
export type StorePage = {
  ownerId: string;
  username: string | null;
  name: string;
  description: string | null;
  website: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  logoPath: string | null;
  coverPath: string | null;
  followerCount: number;
  isOwner: boolean;
  isFollowing: boolean;
  canMessage: boolean;
};

// The owner's own page, as the editor loads it (get_my_store_page).
export type MyStorePage = {
  storeId: string | null;
  osmPlaceId: string | null;
  address: string;
  name: string;
  description: string | null;
  website: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  logoPath: string | null;
  coverPath: string | null;
  followerCount: number;
  canEdit: boolean;
};

export type UpdateStorePagePayload = {
  name: string;
  description: string;
  website: string;
  publicPhone: string;
  publicEmail: string;
  logoPath: string | null;
  coverPath: string | null;
};

export type StoreRef = { storeId: string | null; osmPlaceId: string | null };

export type NearbyStore = StoreRef & {
  profileId: string;
  name: string;
  logoPath: string | null;
  meters: number;
};

// Stripe's subscription status (store_billing.status), or null before the
// subscription exists.
export type StoreSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type StoreBilling = {
  paymentMethodReady: boolean;
  status: StoreSubscriptionStatus | null;
  hasSubscription: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isApproved: boolean;
  // Approved and in good standing (trial, active, or still retrying).
  isPaid: boolean;
};

export type BillingAction = "setup_card" | "portal" | "resubscribe";

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
export type StoreOnboardingStep = "details" | "store" | "photos" | "billing" | "proof" | "status";

// Logo and cover are optional, so the photos step only comes up by itself
// while neither is set and the owner hasn't skipped it (`skippedPhotos`,
// held by the dashboard for the session). A saved card is required before
// the claim can be submitted (`cardReady`, from get_my_store_billing).
export function currentOnboardingStep(
  state: StoreOnboardingState,
  { skippedPhotos = false, cardReady = false }: { skippedPhotos?: boolean; cardReady?: boolean } = {}
): StoreOnboardingStep {
  if (!state.business) return "details";
  const claim = state.claim;
  if (!claim || claim.status === "rejected" || claim.status === "revoked") {
    return claim ? "status" : "store";
  }
  if (claim.status === "draft") {
    if (!claim.store) return "store";
    const hasPhotos = Boolean(state.publicDetails?.logoPath || state.publicDetails?.coverPath);
    if (!hasPhotos && !skippedPhotos) return "photos";
    return cardReady ? "proof" : "billing";
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
  STORE_NOT_APPROVED: "Your store needs to be approved first.",
  STORE_UNPAID: "Your subscription is unpaid. Until it's paid you can only change opening hours.",
  BILLING_REQUIRED: "Add a payment card first.",
  BILLING_UNAVAILABLE: "Billing isn't available right now. Try again in a minute.",
  INVALID_RETURN_URL: "Billing couldn't open from here.",
  SUBSCRIPTION_ACTIVE: "Your subscription is already active.",
  INVALID_WEBSITE: "Enter the full website address, starting with https://",
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
