import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/lib/context/toast-context";
import { exportMyData } from "@/lib/profiles/queries";

async function saveExport(data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const fileName = `skatemeet-data-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Written to the cache dir only long enough to hand to the share sheet;
  // nothing is kept on the server.
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Your SkateMeet data" });
}

export function useExportMyData() {
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => saveExport(await exportMyData()),
    onError: (err) => {
      showToast({ message: err.message.toUpperCase(), variant: "danger" });
    },
  });

  return { exportData: mutation.mutate, isExporting: mutation.isPending };
}
