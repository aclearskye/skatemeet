import { getMyBanReason } from "@/lib/profiles/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

// profileId only keys the cache per account; the RPC itself reads auth.uid().
export function useMyBanReason(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.myBanReason(profileId ?? ""),
    queryFn: getMyBanReason,
    enabled: profileId != null,
  });
}
