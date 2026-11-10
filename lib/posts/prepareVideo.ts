import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { PostError } from "./errors";
import { MAX_VIDEO_SECONDS } from "./types";

// Stream's basic (non-resumable) upload limit.
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
// Picker durations are rounded; Stream itself enforces the hard 60s cap.
const DURATION_SLACK_SECONDS = 0.5;

export type PickedVideo = {
  uri: string;
  mimeType: string;
  durationSeconds: number | null;
  width: number;
  height: number;
};

function toPickedVideo(asset: ImagePicker.ImagePickerAsset): PickedVideo {
  const durationSeconds = asset.duration != null ? asset.duration / 1000 : null;
  if (durationSeconds != null && durationSeconds > MAX_VIDEO_SECONDS + DURATION_SLACK_SECONDS) {
    throw new PostError("VIDEO_TOO_LONG");
  }
  if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) {
    throw new PostError("VIDEO_TOO_LARGE");
  }
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "video/mp4",
    durationSeconds,
    width: asset.width,
    height: asset.height,
  };
}

// iOS shows its own trim screen when allowsEditing is on, capped at
// videoMaxDuration. Android and web have no built-in trimmer, so a longer
// clip is refused with a message instead (a native trim editor is a
// follow-up -- md/media_posts.md §11).
export async function pickPostVideo(): Promise<PickedVideo | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: Platform.OS === "ios",
    videoMaxDuration: MAX_VIDEO_SECONDS,
    // Converts HEVC to H.264 so every device and browser can play the upload.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  return toPickedVideo(result.assets[0]);
}

export async function recordPostVideo(): Promise<PickedVideo | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["videos"],
    videoMaxDuration: MAX_VIDEO_SECONDS,
    allowsEditing: Platform.OS === "ios",
  });
  if (result.canceled || !result.assets[0]) return null;
  return toPickedVideo(result.assets[0]);
}
