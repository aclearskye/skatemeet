import { supabase } from "@/lib/supabaseClient";
import * as ImagePicker from "expo-image-picker";

export async function pickPhotoFromLibrary(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function uploadFile(
  userId: string,
  localUri: string,
  bucket: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
