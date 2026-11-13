import { supabase } from "@/lib/supabaseClient";
import { uploadFileToPath } from "@/lib/storage";
import {
  STORE_CLAIM_EVIDENCE_BUCKET,
  STORE_IMAGES_BUCKET,
  toStoreAccountError,
  type NewClaimStorePayload,
  type PickedEvidenceFile,
  type SaveStoreDetailsPayload,
} from "./types";

export type CreateStoreAccountResult = { needsEmailConfirmation: boolean };

// The only way a Store account is created. handle_new_user reads
// signup_kind and sets profiles.account_type = 'store'.
export async function createStoreAccount(email: string, password: string): Promise<CreateStoreAccountResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { signup_kind: "store" } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Failed to create account");
  return { needsEmailConfirmation: data.session === null };
}

export async function saveStoreDetails(payload: SaveStoreDetailsPayload): Promise<void> {
  const { error } = await supabase.rpc("save_store_business_details", {
    p_legal_name: payload.legalName,
    p_registration_number: payload.registrationNumber,
    p_contact_name: payload.contactName,
    p_contact_role: payload.contactRole,
    p_public_phone: payload.publicPhone ?? "",
    p_public_email: payload.publicEmail ?? "",
    p_logo_path: payload.logoPath,
    p_cover_path: payload.coverPath,
  });
  if (error) throw toStoreAccountError(error);
}

export async function uploadStoreImage(userId: string, uri: string, mimeType: string): Promise<string> {
  return uploadFileToPath(userId, uri, STORE_IMAGES_BUCKET, mimeType);
}

export async function chooseStoreToClaim(storeId: string | null, osmPlaceId: string | null): Promise<void> {
  const { error } = await supabase.rpc("choose_store_to_claim", {
    p_store_id: storeId,
    p_osm_place_id: osmPlaceId,
  });
  if (error) throw toStoreAccountError(error);
}

export async function createStoreForClaim(payload: NewClaimStorePayload): Promise<void> {
  const { error } = await supabase.rpc("create_store_for_claim", {
    p_name: payload.name,
    p_address: payload.address,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_website: payload.website,
    p_phone: payload.phone,
  });
  if (error) throw toStoreAccountError(error);
}

export async function uploadClaimEvidence(userId: string, file: PickedEvidenceFile): Promise<string> {
  return uploadFileToPath(userId, file.uri, STORE_CLAIM_EVIDENCE_BUCKET, file.mimeType);
}

export async function removeClaimEvidence(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORE_CLAIM_EVIDENCE_BUCKET).remove([path]);
  if (error) throw toStoreAccountError(error);
}

export async function submitStoreClaim(evidencePaths: string[], note: string): Promise<void> {
  const { error } = await supabase.rpc("submit_store_claim", {
    p_evidence_paths: evidencePaths,
    p_note: note,
  });
  if (error) throw toStoreAccountError(error);
}

export async function withdrawStoreClaim(): Promise<void> {
  const { error } = await supabase.rpc("withdraw_store_claim");
  if (error) throw toStoreAccountError(error);
}

export async function restartStoreClaim(): Promise<void> {
  const { error } = await supabase.rpc("restart_store_claim");
  if (error) throw toStoreAccountError(error);
}
