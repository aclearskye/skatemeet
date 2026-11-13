import { supabase } from "@/lib/supabaseClient";
import { STORE_CLAIM_EVIDENCE_BUCKET } from "@/lib/storeAccounts/types";
import type { StoreClaimQueueItem } from "./types";

type StoreClaimRow = {
  claim_id: string;
  kind: "claim" | "dispute";
  account_email: string;
  legal_name: string | null;
  registration_number: string | null;
  contact_name: string | null;
  contact_role: string | null;
  public_phone: string | null;
  public_email: string | null;
  osm_place_id: string | null;
  store_name: string;
  store_address: string;
  store_website: string | null;
  store_created_by_applicant: boolean;
  email_domain_match: boolean;
  evidence_paths: string[] | null;
  applicant_note: string | null;
  current_owner_email: string | null;
  submitted_at: string;
};

// Domain-matched claims first, then oldest first.
export async function fetchStoreClaimsQueue(): Promise<StoreClaimQueueItem[]> {
  const { data, error } = await supabase.rpc("admin_list_store_claims");
  if (error) throw error;

  return (data as StoreClaimRow[]).map((row) => ({
    claimId: row.claim_id,
    kind: row.kind,
    accountEmail: row.account_email,
    legalName: row.legal_name,
    registrationNumber: row.registration_number,
    contactName: row.contact_name,
    contactRole: row.contact_role,
    publicPhone: row.public_phone,
    publicEmail: row.public_email,
    storeName: row.store_name,
    storeAddress: row.store_address,
    storeWebsite: row.store_website,
    isOsmStore: row.osm_place_id !== null,
    storeCreatedByApplicant: row.store_created_by_applicant,
    emailDomainMatch: row.email_domain_match,
    evidencePaths: row.evidence_paths ?? [],
    applicantNote: row.applicant_note,
    currentOwnerEmail: row.current_owner_email,
    submittedAt: row.submitted_at,
  }));
}

const EVIDENCE_LINK_SECONDS = 10 * 60;

// Proof documents are private. Admins get a short-lived link to view one.
export async function fetchEvidenceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORE_CLAIM_EVIDENCE_BUCKET)
    .createSignedUrl(path, EVIDENCE_LINK_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
