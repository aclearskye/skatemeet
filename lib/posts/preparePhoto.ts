import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { MAX_PHOTOS_PER_POST } from "./types";

export type CropAspect = "original" | "square" | "portrait";

export const CROP_ASPECTS: { key: CropAspect; label: string; ratio: number | null }[] = [
  { key: "original", label: "ORIGINAL", ratio: null },
  { key: "square", label: "1:1", ratio: 1 },
  { key: "portrait", label: "4:5", ratio: 4 / 5 },
];

// Long edge of the uploaded JPEG. Plenty for a full-screen phone viewer and
// keeps a 10-photo post to a few MB.
const MAX_LONG_EDGE = 2160;
const JPEG_QUALITY = 0.8;

export type PickedPhoto = { uri: string; width: number; height: number };

export async function pickPostPhotos(alreadySelected: number): Promise<PickedPhoto[]> {
  const remaining = MAX_PHOTOS_PER_POST - alreadySelected;
  if (remaining <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    orderedSelection: true,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, remaining).map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

export async function capturePostPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1, exif: false });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

function centreCrop(width: number, height: number, ratio: number) {
  if (width / height > ratio) {
    const cropWidth = Math.round(height * ratio);
    return { originX: Math.round((width - cropWidth) / 2), originY: 0, width: cropWidth, height };
  }
  const cropHeight = Math.round(width / ratio);
  return { originX: 0, originY: Math.round((height - cropHeight) / 2), width, height: cropHeight };
}

// Crops (centred) to the chosen aspect, caps the size and re-encodes as
// JPEG. Re-encoding is what strips EXIF -- including GPS -- and every other
// metadata block; the moderation function double-checks server-side.
export async function preparePhoto(photo: PickedPhoto, aspect: CropAspect): Promise<PickedPhoto> {
  const ratio = CROP_ASPECTS.find((a) => a.key === aspect)?.ratio ?? null;
  const context = ImageManipulator.manipulate(photo.uri);

  let width = photo.width;
  let height = photo.height;
  if (ratio && width > 0 && height > 0) {
    const rect = centreCrop(width, height, ratio);
    context.crop(rect);
    width = rect.width;
    height = rect.height;
  }
  if (Math.max(width, height) > MAX_LONG_EDGE) {
    context.resize(width >= height ? { width: MAX_LONG_EDGE } : { height: MAX_LONG_EDGE });
  }

  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  image.release();
  context.release();
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
