import { supabase } from "@/lib/supabaseClient";
import * as ImagePicker from "expo-image-picker";

export type PickedPhoto = { uri: string; mimeType: string };

export async function pickPhotoFromLibrary(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" };
}

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? "jpg";
  return subtype === "jpeg" ? "jpg" : subtype;
}

export async function uploadFile(
  userId: string,
  localUri: string,
  bucket: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.${extensionForMimeType(mimeType)}`;

  // response.blob() silently yields an empty blob for local file:// URIs on
  // React Native — arrayBuffer() reads the same bytes reliably instead.
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}
