import { useQuery } from "@tanstack/react-query";
import { fetchProfileCard } from "@/lib/profiles/queries";
import { queryKeys } from "@/utils/queryKeys";

export function useProfileCard(profileId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.profileCard(profileId ?? ""),
    queryFn: () => fetchProfileCard(profileId!),
    enabled: enabled && profileId != null,
  });
}
