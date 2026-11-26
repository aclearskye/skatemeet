import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

type SaveFileOptions = {
  fileName: string;
  content: string;
  mimeType: string;
  // The share sheet's title on native.
  dialogTitle: string;
};

// Hands a generated text file to the user: a download on web, the share
// sheet on native (save to Files, AirDrop, email, print). The file only
// sits in the cache directory long enough to share; nothing is kept.
export async function saveTextFile({ fileName, content, mimeType, dialogTitle }: SaveFileOptions): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}
