import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { ensurePushRegistered } from "@/lib/notifications/pushRegistration";
import { queryKeys } from "@/utils/queryKeys";
import { prependMessage, replaceMessage, type SpotChatPages } from "../messageCache";
import { sendSpotChatMessage } from "../mutations";
import type { SpotChatMessage } from "../types";

export function useSendSpotChatMessage(roomId: string | null) {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const threadKey = queryKeys.spotChatMessages(roomId ?? "");

  const mutation = useMutation({
    mutationFn: ({ body }: { body: string; tempId: string }) => sendSpotChatMessage(roomId!, body),
    onMutate: async ({ body, tempId }) => {
      await queryClient.cancelQueries({ queryKey: threadKey });
      const optimistic: SpotChatMessage = {
        messageId: tempId,
        body,
        createdAt: new Date().toISOString(),
        isMine: true,
        isHeld: false,
        senderAlias: null,
        senderName: profile?.display_name || "You",
        senderAvatarUrl: profile?.avatar_url ?? null,
        isPending: true,
      };
      queryClient.setQueryData<SpotChatPages>(threadKey, (old) => prependMessage(old, optimistic));
    },
    onSuccess: (message, { tempId }) => {
      queryClient.setQueryData<SpotChatPages>(threadKey, (old) => replaceMessage(old, tempId, message));
      // Covers members who joined before joining asked for push.
      ensurePushRegistered();
    },
    onError: (_err, { tempId }) => {
      queryClient.setQueryData<SpotChatPages>(threadKey, (old) => replaceMessage(old, tempId, null));
    },
  });

  return {
    send: (body: string, options?: { onError?: (err: Error) => void }) =>
      mutation.mutate({ body, tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}` }, options),
    isSending: mutation.isPending,
  };
}
