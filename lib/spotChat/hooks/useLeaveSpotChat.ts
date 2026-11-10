import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { leaveSpotChat } from "../mutations";
import { spotChatKey, type SpotChatRoom, type SpotChatSpotRef } from "../types";

// Leaving keeps the log for everyone; rejoining shows it again.
export function useLeaveSpotChat(ref: SpotChatSpotRef, roomId: string | null) {
  const queryClient = useQueryClient();
  const roomKey = queryKeys.spotChatRoom(spotChatKey(ref));

  const mutation = useMutation({
    mutationFn: () => leaveSpotChat(roomId!),
    onSuccess: () => {
      queryClient.setQueryData<SpotChatRoom>(roomKey, (old) =>
        old ? { ...old, isMember: false, memberCount: Math.max(0, old.memberCount - 1) } : old
      );
      if (roomId) queryClient.removeQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: roomKey });
    },
  });

  return { leave: mutation.mutate, isLeaving: mutation.isPending };
}
