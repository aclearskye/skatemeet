import { reviewCaptionFlag } from "@/lib/admin/postModerationMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useReviewCaptionFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => reviewCaptionFlag(eventId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCaptionFlags() });
    },
  });
}
