import { fetchBanHistory } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useBanHistory(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.adminBanHistory(profileId ?? ""),
    queryFn: () => fetchBanHistory(profileId!),
    enabled: profileId != null,
  });
}
