import type { Coordinates } from "@/lib/map/types";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { supabase } from "@/lib/supabaseClient";

// One page of skaters near `location`, in distance bands with a shuffled
// order inside each band. The server never returns how far anyone is, and
// private accounts are never included, so isPrivate is always false.
export async function searchNearbySkaters(location: Coordinates, page: number): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc("search_nearby_skaters", {
    p_lat: location.lat,
    p_lng: location.lng,
    p_page: page,
  });
  if (error) throw error;

  return (data ?? []).map(
    (row: {
      profile_id: string;
      username: string;
      display_name: string | null;
      disciplines: string[] | null;
      city: string | null;
      avatar_url: string | null;
    }) => ({
      profileId: row.profile_id,
      username: row.username,
      displayName: row.display_name,
      disciplines: row.disciplines,
      city: row.city,
      avatarUrl: row.avatar_url,
      isPrivate: false,
    })
  );
}
