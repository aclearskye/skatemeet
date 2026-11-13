import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { ensurePushRegistered } from "@/lib/notifications/pushRegistration";
import { queryKeys } from "@/utils/queryKeys";
import { joinSpotChat } from "../mutations";
import { spotChatKey, type SpotChatRoom, type SpotChatSpotRef } from "../types";

export function useJoinSpotChat(ref: SpotChatSpotRef) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const roomKey = queryKeys.spotChatRoom(spotChatKey(ref));

  const mutation = useMutation({
    mutationFn: () => joinSpotChat(ref),
    onSuccess: (roomId) => {
      // Joining is when replies start to matter: ask for push now.
      ensurePushRegistered();
      queryClient.setQueryData<SpotChatRoom>(roomKey, (old) =>
        old ? { ...old, roomId, isMember: true, memberCount: old.isMember ? old.memberCount : old.memberCount + 1 } : old
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mySpotChats(session?.user.id ?? "") });
      queryClient.invalidateQueries({ queryKey: roomKey });
    },
  });

  return { join: mutation.mutate, isJoining: mutation.isPending };
}
