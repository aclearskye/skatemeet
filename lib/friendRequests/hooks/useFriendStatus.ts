import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { getFriendStatus } from "../queries";

export function useFriendStatus(otherProfileId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.friendStatus(viewerId ?? "", otherProfileId),
    queryFn: () => getFriendStatus(otherProfileId),
    // Guards against the own-profile screen (where otherProfileId ===
    // viewerId) making a pointless self-status round trip.
    enabled: viewerId != null && viewerId !== otherProfileId,
  });
}
