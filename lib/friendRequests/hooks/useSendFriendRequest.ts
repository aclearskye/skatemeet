import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { sendFriendRequest } from "../mutations";
import type { FriendStatusResult } from "../types";

export function useSendFriendRequest(otherProfileId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = queryKeys.friendStatus(viewerId ?? "", otherProfileId);

  const mutation = useMutation({
    mutationFn: () => sendFriendRequest(otherProfileId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FriendStatusResult>(queryKey);
      // requestId is unknown until the RPC resolves -- onSettled refetches
      // the real value immediately after, so this is only ever shown for
      // the brief optimistic window.
      queryClient.setQueryData<FriendStatusResult>(queryKey, {
        status: "pending_sent",
        requestId: null,
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    sendRequest: mutation.mutate,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}
