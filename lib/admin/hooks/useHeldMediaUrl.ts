import { fetchHeldMediaUrl } from "@/lib/admin/postModerationQueries";
import type { HeldPostMedia } from "@/lib/admin/types";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

// Signed URLs last 10 minutes; refetch a little before that.
const SIGNED_URL_STALE_MS = 8 * 60 * 1000;

export function useHeldMediaUrl(media: HeldPostMedia | null) {
  return useQuery({
    queryKey: queryKeys.adminHeldMediaUrl(media?.bucket ?? "", media?.storagePath ?? media?.mediaUrl ?? ""),
    queryFn: () => fetchHeldMediaUrl(media!),
    enabled: media != null,
    staleTime: SIGNED_URL_STALE_MS,
  });
}
