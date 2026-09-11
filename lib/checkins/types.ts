export type EntityRef = {
  spotId: string | null;
  osmSpotPlaceId: string | null;
  storeId: string | null;
  osmStorePlaceId: string | null;
};

export type CheckIn = {
  check_in_id: string;
  profile_id: string;
  spot_id: string | null;
  osm_spot_place_id: string | null;
  store_id: string | null;
  osm_store_place_id: string | null;
  entity_key: string;
  checked_in_at: string;
  checked_in_source: "manual" | "entity_created";
  checked_out_at: string | null;
  checked_out_reason: "manual" | "auto_distance" | "auto_expired" | "replaced" | null;
};

export function entityKeyOf(ref: EntityRef): string | null {
  return ref.spotId ?? ref.osmSpotPlaceId ?? ref.storeId ?? ref.osmStorePlaceId ?? null;
}

export function isSameEntity(a: EntityRef, b: EntityRef): boolean {
  return entityKeyOf(a) === entityKeyOf(b);
}

export type UserStreak = {
  profile_id: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
};
