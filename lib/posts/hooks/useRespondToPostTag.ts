import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { respondToPostTag } from "@/lib/posts/mutations";
import { queryKeys } from "@/utils/queryKeys";

export function useRespondToPostTag() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ postId, accept }: { postId: string; accept: boolean }) => respondToPostTag(postId, accept),
    onSettled: (_data, _error, { postId }) => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taggedPosts(userId) });
    },
  });

  return { respond: mutation.mutate, isResponding: mutation.isPending };
}
