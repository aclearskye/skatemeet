import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/profiles/queries";
import { queryKeys } from "@/utils/queryKeys";

// Friend-request hooks invalidate this once the server has the new
// friendship, so a private profile unlocks (or locks again) in place.
export function useUserProfile(profileId: string | null) {
  return useQuery({
    queryKey: queryKeys.userProfile(profileId ?? ""),
    queryFn: () => fetchUserProfile(profileId!),
    enabled: profileId != null,
  });
}
