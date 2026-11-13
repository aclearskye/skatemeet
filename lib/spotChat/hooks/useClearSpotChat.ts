import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { clearSpotChat } from "../mutations";

// Clears the whole log for the viewer only; everyone else keeps theirs.
export function useClearSpotChat(roomId: string | null) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => clearSpotChat(roomId!),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mySpotChats(session?.user.id ?? "") });
      if (roomId) queryClient.resetQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
    },
  });

  return { clear: mutation.mutate, isClearing: mutation.isPending };
}
