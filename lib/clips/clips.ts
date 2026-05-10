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
  shop_id: string | null;
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

export async function getProfileSpotCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_spots")
    .select("*", { count: "exact", head: true })
    .eq("created_by", profileId);
  if (error) { console.error(error); return 0; }
  return count ?? 0;
}

export async function getProfileClipCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("clips")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId);
  if (error) { console.error(error); return 0; }
  return count ?? 0;
}

export async function getProfileCrewCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("crew_follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profileId);
  if (error) { console.error(error); return 0; }
  return count ?? 0;
}

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
