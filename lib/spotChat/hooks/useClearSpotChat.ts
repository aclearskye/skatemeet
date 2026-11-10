import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { clearSpotChat } from "../mutations";

// Clears the whole log for the viewer only; everyone else keeps theirs.
export function useClearSpotChat(roomId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => clearSpotChat(roomId!),
    onSettled: () => {
      if (roomId) queryClient.resetQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
    },
  });

  return { clear: mutation.mutate, isClearing: mutation.isPending };
}
