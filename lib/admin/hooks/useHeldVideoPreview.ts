import { useQuery } from "@tanstack/react-query";
import { fetchHeldVideoPreview } from "@/lib/admin/postModerationQueries";
import { queryKeys } from "@/utils/queryKeys";

// Signed links last an hour; refresh well before that.
const PREVIEW_STALE_MS = 45 * 60 * 1000;

export function useHeldVideoPreview(postId: string | null) {
  return useQuery({
    queryKey: queryKeys.adminHeldVideoPreview(postId ?? ""),
    queryFn: () => fetchHeldVideoPreview(postId!),
    enabled: postId != null,
    staleTime: PREVIEW_STALE_MS,
  });
}
