import { resolveReviewReport } from "@/lib/admin/mutations";
import type { AdminEntityKind, ReportResolution } from "@/lib/admin/types";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Variables = {
  reviewId: string;
  entityKind: AdminEntityKind;
  resolution: ReportResolution;
};

export function useResolveReviewReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, entityKind, resolution }: Variables) =>
      resolveReviewReport(reviewId, entityKind, resolution),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminReviewReports() });
    },
  });
}
