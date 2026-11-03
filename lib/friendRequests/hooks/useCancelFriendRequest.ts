import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { cancelFriendRequest } from "../mutations";
import type { FriendStatusResult } from "../types";

export function useCancelFriendRequest(otherProfileId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = queryKeys.friendStatus(viewerId ?? "", otherProfileId);

  const mutation = useMutation({
    mutationFn: () => cancelFriendRequest(otherProfileId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FriendStatusResult>(queryKey);
      queryClient.setQueryData<FriendStatusResult>(queryKey, { status: "none", requestId: null });
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
    cancelRequest: mutation.mutate,
    isCancelling: mutation.isPending,
  };
}
