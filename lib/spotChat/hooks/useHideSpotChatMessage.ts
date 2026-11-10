import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { replaceMessage, type SpotChatPages } from "../messageCache";
import { hideSpotChatMessage } from "../mutations";

// "Delete for me": gone from the viewer's log only.
export function useHideSpotChatMessage(roomId: string | null) {
  const queryClient = useQueryClient();
  const threadKey = queryKeys.spotChatMessages(roomId ?? "");

  const mutation = useMutation({
    mutationFn: (messageId: string) => hideSpotChatMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: threadKey });
      const previous = queryClient.getQueryData<SpotChatPages>(threadKey);
      queryClient.setQueryData<SpotChatPages>(threadKey, (old) => replaceMessage(old, messageId, null));
      return { previous };
    },
    onError: (_err, _messageId, context) => {
      if (context?.previous) queryClient.setQueryData(threadKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: threadKey });
    },
  });

  return { hide: mutation.mutate, isHiding: mutation.isPending };
}
