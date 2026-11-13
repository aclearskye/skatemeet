import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { setSpotChatMuted } from "../mutations";
import type { SpotChatListItem } from "../types";

// Optimistic: the bell icon flips on the card straight away.
export function useSetSpotChatMuted(roomId: string) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const listKey = queryKeys.mySpotChats(session?.user.id ?? "");

  const mutation = useMutation({
    mutationFn: (muted: boolean) => setSpotChatMuted(roomId, muted),
    onMutate: async (muted) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<SpotChatListItem[]>(listKey);
      queryClient.setQueryData<SpotChatListItem[]>(listKey, (old) =>
        old?.map((chat) => (chat.roomId === roomId ? { ...chat, muted } : chat))
      );
      return { previous };
    },
    onError: (_err, _muted, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  return { setMuted: mutation.mutate, isSettingMuted: mutation.isPending };
}
