import { supabase } from "@/lib/supabaseClient";
import { EntityRef } from "./types";

export type CheckInErrorCode = "TOO_FAR" | "ENTITY_NOT_FOUND" | "PERMISSION_DENIED" | "UNKNOWN";

export class CheckInError extends Error {
  code: CheckInErrorCode;
  constructor(code: CheckInErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function toCheckInError(error: { message: string }): CheckInError {
  if (error.message.includes("TOO_FAR")) {
    return new CheckInError("TOO_FAR", "You're too far away to check in here.");
  }
  if (error.message.includes("ENTITY_NOT_FOUND")) {
    return new CheckInError("ENTITY_NOT_FOUND", "This spot could not be found.");
  }
  return new CheckInError("UNKNOWN", error.message);
}

// 'awarded' -- paid out immediately (verified spot, or a store/OSM entity,
//   which are never gated).
// 'banked' -- unverified user-submitted spot; XP held in pending_xp_events
//   until the spot is verified (admin approval or community threshold).
// 'daily_cap' -- no XP this time; today's once-per-day-total slot was
//   already claimed (awarded or banked) at a different entity.
// 'none' -- idempotent no-op (already checked in here).
export type CheckInXpStatus = "awarded" | "banked" | "daily_cap" | "none";

export type CheckInResult = {
  checkInId: string;
  xpStatus: CheckInXpStatus;
  // true only on the exact check-in that pushed a spot over the community
  // verification threshold, releasing every banked entry for it.
  spotVerifiedNow: boolean;
};

export async function checkIn(ref: EntityRef, lat: number, lng: number): Promise<CheckInResult> {
  const { data, error } = await supabase
    .rpc("check_in", {
      p_spot_id: ref.spotId,
      p_osm_spot_place_id: ref.osmSpotPlaceId,
      p_store_id: ref.storeId,
      p_osm_store_place_id: ref.osmStorePlaceId,
      p_lat: lat,
      p_lng: lng,
    })
    .single();
  if (error) throw toCheckInError(error);
  const row = data as { check_in_id: string; xp_status: CheckInXpStatus; spot_verified_now: boolean };
  return { checkInId: row.check_in_id, xpStatus: row.xp_status, spotVerifiedNow: row.spot_verified_now };
}

export async function checkOut(): Promise<void> {
  const { error } = await supabase.rpc("check_out");
  if (error) throw error;
}

export type SyncResult = {
  isActive: boolean;
  checkInId: string | null;
  checkedOutReason: "auto_distance" | "auto_expired" | null;
};

export async function syncCheckInStatus(lat: number, lng: number): Promise<SyncResult> {
  const { data, error } = await supabase
    .rpc("sync_check_in_status", { p_lat: lat, p_lng: lng })
    .single();
  if (error) throw error;
  const row = data as { is_active: boolean; check_in_id: string | null; checked_out_reason: string | null };
  return {
    isActive: row.is_active,
    checkInId: row.check_in_id,
    checkedOutReason: row.checked_out_reason as SyncResult["checkedOutReason"],
  };
}
