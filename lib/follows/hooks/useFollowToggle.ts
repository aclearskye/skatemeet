import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { toggleFollow } from "@/lib/follows/mutations";
import { isFollowing } from "@/lib/follows/queries";
import type { FollowCounts } from "@/lib/follows/types";
import { queryKeys } from "@/utils/queryKeys";

// Follow state for one profile, with an optimistic toggle that also nudges
// their follower count.
export function useFollowToggle(profileId: string) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const viewerId = session?.user.id ?? null;
  const statusKey = queryKeys.followStatus(viewerId ?? "", profileId);
  const countsKey = queryKeys.followCounts(profileId);

  const { data: following = false, isLoading } = useQuery({
    queryKey: statusKey,
    queryFn: () => isFollowing(viewerId!, profileId),
    enabled: viewerId != null && viewerId !== profileId,
  });

  const mutation = useMutation({
    mutationFn: () => toggleFollow(profileId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const prevStatus = queryClient.getQueryData<boolean>(statusKey);
      const prevCounts = queryClient.getQueryData<FollowCounts>(countsKey);
      const next = !prevStatus;
      queryClient.setQueryData(statusKey, next);
      if (prevCounts) {
        queryClient.setQueryData(countsKey, { ...prevCounts, followers: prevCounts.followers + (next ? 1 : -1) });
      }
      return { prevStatus, prevCounts };
    },
    onError: (_e, _v, context) => {
      queryClient.setQueryData(statusKey, context?.prevStatus);
      queryClient.setQueryData(countsKey, context?.prevCounts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusKey });
      queryClient.invalidateQueries({ queryKey: countsKey });
      if (viewerId) queryClient.invalidateQueries({ queryKey: queryKeys.followCounts(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feedBase });
    },
  });

  return { following, isLoading, toggle: () => mutation.mutate(), isUpdating: mutation.isPending, error: mutation.error };
}
