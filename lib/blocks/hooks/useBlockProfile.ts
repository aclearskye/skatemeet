import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { blockProfile, unblockProfile } from "../mutations";
import type { BlockedProfile } from "../types";

type MutateOptions = { onSuccess?: () => void; onError?: (err: Error) => void };

// Block and unblock as one hook: they touch exactly the same caches.
export function useBlockProfile(otherProfileId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const statusKey = queryKeys.blockStatus(viewerId ?? "", otherProfileId);
  const blocksKey = queryKeys.myBlocks(viewerId ?? "");

  const mutation = useMutation({
    mutationFn: (block: boolean) => (block ? blockProfile(otherProfileId) : unblockProfile(otherProfileId)),
    onMutate: async (block) => {
      await Promise.all([statusKey, blocksKey].map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const previousStatus = queryClient.getQueryData<boolean>(statusKey);
      const previousBlocks = queryClient.getQueryData<BlockedProfile[]>(blocksKey);
      queryClient.setQueryData<boolean>(statusKey, block);
      if (!block) {
        queryClient.setQueryData<BlockedProfile[]>(blocksKey, (old) =>
          old?.filter((blocked) => blocked.profileId !== otherProfileId)
        );
      }
      return { previousStatus, previousBlocks };
    },
    onError: (_err, _block, context) => {
      queryClient.setQueryData(statusKey, context?.previousStatus);
      if (context?.previousBlocks) queryClient.setQueryData(blocksKey, context.previousBlocks);
    },
    onSettled: () => {
      if (!viewerId) return;
      // A block drops the friendship and locks any chat between the pair.
      queryClient.invalidateQueries({ queryKey: statusKey });
      queryClient.invalidateQueries({ queryKey: blocksKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendStatus(viewerId, otherProfileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(otherProfileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileCard(otherProfileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(viewerId) });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "chat" && query.queryKey[2] === "summary",
      });
    },
  });

  return {
    block: (options?: MutateOptions) => mutation.mutate(true, options),
    unblock: (options?: MutateOptions) => mutation.mutate(false, options),
    isUpdating: mutation.isPending,
  };
}
