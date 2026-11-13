import * as DocumentPicker from "expo-document-picker";
import {
  CLAIM_EVIDENCE_MIME_TYPES,
  MAX_CLAIM_EVIDENCE_BYTES,
  StoreAccountError,
  type PickedEvidenceFile,
} from "./types";

// Opens the system file picker for one proof document (PDF or image).
// Resolves to null if the user cancels. Rejects files the evidence bucket
// would refuse, so the error shows before an upload is attempted.
export async function pickEvidenceFile(): Promise<PickedEvidenceFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: CLAIM_EVIDENCE_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "";
  if (!CLAIM_EVIDENCE_MIME_TYPES.includes(mimeType)) {
    throw new StoreAccountError("UNSUPPORTED_FILE", "Upload a PDF, JPG, PNG, HEIC or WEBP file.");
  }
  if (asset.size != null && asset.size > MAX_CLAIM_EVIDENCE_BYTES) {
    throw new StoreAccountError("FILE_TOO_LARGE", "Each file must be 10 MB or smaller.");
  }
  return { uri: asset.uri, name: asset.name, mimeType, size: asset.size ?? null };
}
