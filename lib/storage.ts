import { supabase } from "@/lib/supabaseClient";
import * as ImagePicker from "expo-image-picker";

export type PickedPhoto = { uri: string; mimeType: string };

// Where a photo comes from: the device's photos / files (web opens the
// browser's file picker), or the camera (native only).
export type PhotoSource = "library" | "camera";

function toPickedPhoto(result: ImagePicker.ImagePickerResult): PickedPhoto | null {
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" };
}

export async function pickPhotoFromLibrary(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  return toPickedPhoto(result);
}

// Asks for camera permission first; a denial resolves to null, like a
// cancelled shot.
export async function takePhotoWithCamera(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    exif: false,
  });
  return toPickedPhoto(result);
}

export function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  return source === "camera" ? takePhotoWithCamera() : pickPhotoFromLibrary();
}

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? "jpg";
  return subtype === "jpeg" ? "jpg" : subtype;
}

// Uploads under the user's own folder and returns the object path. Use this
// for private buckets, where there's no public URL to hand back.
export async function uploadFileToPath(
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
  return fileName;
}

export async function uploadFile(
  userId: string,
  localUri: string,
  bucket: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const path = await uploadFileToPath(userId, localUri, bucket, mimeType);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
