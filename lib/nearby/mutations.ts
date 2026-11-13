import type { Coordinates } from "@/lib/map/types";
import { supabase } from "@/lib/supabaseClient";

// The server rounds this to a ~2 km cell before storing it, and ignores it
// for accounts that are private or not discoverable.
export async function reportLiveLocation(location: Coordinates): Promise<void> {
  const { error } = await supabase.rpc("report_live_location", { p_lat: location.lat, p_lng: location.lng });
  if (error) throw error;
}

// Turning it off also deletes the stored location (a trigger on profiles).
// Reads the row back for the same reason as updateProfilePrivacy: a
// zero-row update must not look like success.
export async function updateDiscoverable(profileId: string, isDiscoverable: boolean): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ show_in_nearby: isDiscoverable })
    .eq("profile_id", profileId)
    .select("show_in_nearby")
    .single();
  if (error) throw error;
}
