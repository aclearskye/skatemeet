import { resolvePhotoReport } from "@/lib/admin/mutations";
import type { AdminEntityKind, ReportResolution } from "@/lib/admin/types";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Variables = {
  photoId: string;
  entityKind: AdminEntityKind;
  resolution: ReportResolution;
};

export function useResolvePhotoReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, entityKind, resolution }: Variables) =>
      resolvePhotoReport(photoId, entityKind, resolution),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPhotoReports() });
    },
  });
}
