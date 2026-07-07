import { supabase } from "@/lib/supabaseClient";

export type Clip = {
  clip_id: string;
  profile_id: string;
  media_url: string;
  media_type: "photo" | "video";
  thumbnail_url: string | null;
  duration_seconds: number | null;
  caption: string | null;
  spot_id: string | null;
  store_id: string | null;
  created_at: string;
};

export async function fetchProfileClips(profileId: string): Promise<Clip[]> {
  const { data, error } = await supabase
    .from("clips")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Clip[];
}

async function fetchCount(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

export const getProfileSpotCount = (profileId: string) => fetchCount("user_spots", "created_by", profileId);
export const getProfileClipCount = (profileId: string) => fetchCount("clips", "profile_id", profileId);
export const getProfileCrewCount = (profileId: string) => fetchCount("crew_follows", "follower_id", profileId);

export async function uploadAvatar(
  profileId: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "jpg";
  const path = `${profileId}/avatar.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: mimeType });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
