import { supabase } from "@/lib/supabaseClient";
import {
  STORE_IMAGES_BUCKET,
  toStoreAccountError,
  type ClaimableStore,
  type MyStorePage,
  type NearbyStore,
  type StorePage,
  type StoreRef,
  type StoreClaim,
  type StoreOnboardingState,
} from "./types";

type OnboardingRow = {
  business: {
    legal_name: string;
    registration_number: string;
    contact_name: string;
    contact_role: string;
  } | null;
  public: {
    public_phone: string | null;
    public_email: string | null;
    logo_path: string | null;
    cover_path: string | null;
  } | null;
  claim: {
    claim_id: string;
    status: StoreClaim["status"];
    kind: StoreClaim["kind"];
    store_id: string | null;
    osm_place_id: string | null;
    evidence_paths: string[] | null;
    applicant_note: string | null;
    review_notes: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    store: { name: string; address: string; website: string | null; created_by_me: boolean } | null;
  } | null;
};

export async function fetchStoreOnboarding(): Promise<StoreOnboardingState> {
  const { data, error } = await supabase.rpc("get_my_store_onboarding");
  if (error) throw toStoreAccountError(error);
  const row = data as OnboardingRow;

  return {
    business: row.business
      ? {
          legalName: row.business.legal_name,
          registrationNumber: row.business.registration_number,
          contactName: row.business.contact_name,
          contactRole: row.business.contact_role,
        }
      : null,
    publicDetails: row.public
      ? {
          publicPhone: row.public.public_phone,
          publicEmail: row.public.public_email,
          logoPath: row.public.logo_path,
          coverPath: row.public.cover_path,
        }
      : null,
    claim: row.claim
      ? {
          claimId: row.claim.claim_id,
          status: row.claim.status,
          kind: row.claim.kind,
          storeId: row.claim.store_id,
          osmPlaceId: row.claim.osm_place_id,
          evidencePaths: row.claim.evidence_paths ?? [],
          applicantNote: row.claim.applicant_note,
          reviewNotes: row.claim.review_notes,
          submittedAt: row.claim.submitted_at,
          reviewedAt: row.claim.reviewed_at,
          store: row.claim.store
            ? {
                name: row.claim.store.name,
                address: row.claim.store.address,
                website: row.claim.store.website,
                createdByMe: row.claim.store.created_by_me,
              }
            : null,
        }
      : null,
  };
}

type ClaimableStoreRow = {
  store_id: string | null;
  osm_place_id: string | null;
  name: string;
  address: string;
  website: string | null;
  is_owned: boolean;
};

export async function searchClaimableStores(query: string): Promise<ClaimableStore[]> {
  const { data, error } = await supabase.rpc("search_claimable_stores", { p_query: query });
  if (error) throw toStoreAccountError(error);
  return (data as ClaimableStoreRow[]).map((row) => ({
    storeId: row.store_id,
    osmPlaceId: row.osm_place_id,
    name: row.name,
    address: row.address,
    website: row.website,
    isOwned: row.is_owned,
  }));
}

export function storeImageUrl(path: string): string {
  return supabase.storage.from(STORE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

// The file name shown for an uploaded proof document ("<uid>/<time>.pdf").
export function evidenceFileLabel(path: string, index: number): string {
  const extension = path.split(".").pop()?.toUpperCase() ?? "FILE";
  return `Document ${index + 1} (${extension})`;
}

type StorePageRow = {
  owner_id: string;
  username: string | null;
  name: string;
  description: string | null;
  website: string | null;
  public_phone: string | null;
  public_email: string | null;
  logo_path: string | null;
  cover_path: string | null;
  follower_count: number;
  is_owner: boolean;
  is_following: boolean;
  can_message: boolean;
};

export async function fetchStorePage(storeId: string | null, osmPlaceId: string | null): Promise<StorePage | null> {
  const { data, error } = await supabase.rpc("get_store_page", { p_store_id: storeId, p_osm_place_id: osmPlaceId });
  if (error) throw toStoreAccountError(error);
  const row = data as StorePageRow | null;
  if (!row) return null;
  return {
    ownerId: row.owner_id,
    username: row.username,
    name: row.name,
    description: row.description,
    website: row.website,
    publicPhone: row.public_phone,
    publicEmail: row.public_email,
    logoPath: row.logo_path,
    coverPath: row.cover_path,
    followerCount: row.follower_count,
    isOwner: row.is_owner,
    isFollowing: row.is_following,
    canMessage: row.can_message,
  };
}

type MyStorePageRow = {
  store_id: string | null;
  osm_place_id: string | null;
  address: string;
  name: string;
  description: string | null;
  website: string | null;
  public_phone: string | null;
  public_email: string | null;
  logo_path: string | null;
  cover_path: string | null;
  follower_count: number;
  can_edit: boolean;
};

export async function fetchMyStorePage(): Promise<MyStorePage | null> {
  const { data, error } = await supabase.rpc("get_my_store_page");
  if (error) throw toStoreAccountError(error);
  const row = data as MyStorePageRow | null;
  if (!row) return null;
  return {
    storeId: row.store_id,
    osmPlaceId: row.osm_place_id,
    address: row.address,
    name: row.name,
    description: row.description,
    website: row.website,
    publicPhone: row.public_phone,
    publicEmail: row.public_email,
    logoPath: row.logo_path,
    coverPath: row.cover_path,
    followerCount: row.follower_count,
    canEdit: row.can_edit,
  };
}

// The store an approved Store account owns, or null for any other profile.
export async function fetchStoreForProfile(profileId: string): Promise<StoreRef | null> {
  const { data, error } = await supabase.rpc("get_store_for_profile", { p_profile_id: profileId });
  if (error) throw toStoreAccountError(error);
  const row = data as { store_id: string | null; osm_place_id: string | null } | null;
  return row ? { storeId: row.store_id, osmPlaceId: row.osm_place_id } : null;
}

type NearbyStoreRow = {
  profile_id: string;
  name: string;
  logo_path: string | null;
  store_id: string | null;
  osm_place_id: string | null;
  meters: number;
};

export async function searchNearbyStores(lat: number, lng: number): Promise<NearbyStore[]> {
  const { data, error } = await supabase.rpc("search_nearby_stores", { p_lat: lat, p_lng: lng });
  if (error) throw toStoreAccountError(error);
  return (data as NearbyStoreRow[]).map((row) => ({
    profileId: row.profile_id,
    name: row.name,
    logoPath: row.logo_path,
    storeId: row.store_id,
    osmPlaceId: row.osm_place_id,
    meters: row.meters,
  }));
}
