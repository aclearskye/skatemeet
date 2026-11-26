import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/lib/context/toast-context";
import { exportMyData } from "@/lib/profiles/queries";
import { saveTextFile } from "@/lib/shared/saveFile";

function saveExport(data: unknown): Promise<void> {
  return saveTextFile({
    fileName: `skatemeet-data-${new Date().toISOString().slice(0, 10)}.json`,
    content: JSON.stringify(data, null, 2),
    mimeType: "application/json",
    dialogTitle: "Your SkateMeet data",
  });
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
