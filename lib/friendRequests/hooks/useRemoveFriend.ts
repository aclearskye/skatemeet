import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { queryKeys } from "@/utils/queryKeys";
import { removeFriend } from "../mutations";
import type { FriendStatusResult } from "../types";

export function useRemoveFriend(otherProfileId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = queryKeys.friendStatus(viewerId ?? "", otherProfileId);
  const countKeys = [queryKeys.friendCount(viewerId ?? ""), queryKeys.friendCount(otherProfileId)];
  const listKey = queryKeys.friendsList(viewerId ?? "");

  const mutation = useMutation({
    mutationFn: () => removeFriend(otherProfileId),
    onMutate: async () => {
      await Promise.all(
        [queryKey, listKey, ...countKeys].map((key) => queryClient.cancelQueries({ queryKey: key }))
      );
      const previous = queryClient.getQueryData<FriendStatusResult>(queryKey);
      const previousList = queryClient.getQueryData<ProfileSearchResult[]>(listKey);
      const previousCounts = countKeys.map((key) => queryClient.getQueryData<number>(key));
      queryClient.setQueryData<FriendStatusResult>(queryKey, { status: "none", requestId: null });
      queryClient.setQueryData<ProfileSearchResult[]>(listKey, (old) =>
        old?.filter((friend) => friend.profileId !== otherProfileId)
      );
      countKeys.forEach((key) => {
        queryClient.setQueryData<number>(key, (old) => (old === undefined ? old : Math.max(0, old - 1)));
      });
      return { previous, previousList, previousCounts };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousList) queryClient.setQueryData(listKey, context.previousList);
      context?.previousCounts.forEach((count, i) => queryClient.setQueryData(countKeys[i], count));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // Both sides' friend counts change, and the viewer's list loses a row.
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(otherProfileId) });
      if (!viewerId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
    },
  });

  return {
    unfriend: mutation.mutate,
    isUnfriending: mutation.isPending,
  };
}
