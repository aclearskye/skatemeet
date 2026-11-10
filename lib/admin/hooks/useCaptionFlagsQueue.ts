import { fetchCaptionFlags } from "@/lib/admin/postModerationQueries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useCaptionFlagsQueue() {
  return useQuery({
    queryKey: queryKeys.adminCaptionFlags(),
    queryFn: fetchCaptionFlags,
  });
}
