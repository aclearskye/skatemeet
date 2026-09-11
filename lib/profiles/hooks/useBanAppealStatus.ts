import { getBanAppealStatus } from "@/lib/profiles/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useBanAppealStatus(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.banAppealStatus(profileId ?? ""),
    queryFn: () => getBanAppealStatus(profileId!),
    enabled: profileId != null,
  });
}
