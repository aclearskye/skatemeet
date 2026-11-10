import { useQuery } from "@tanstack/react-query";
import { getFollowCounts } from "@/lib/follows/queries";
import { queryKeys } from "@/utils/queryKeys";

export function useFollowCounts(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.followCounts(profileId ?? ""),
    queryFn: () => getFollowCounts(profileId!),
    enabled: profileId != null,
  });
}
