import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { archivePost, deletePost, pinPost, updatePost, type UpdatePostInput } from "@/lib/posts/mutations";
import { queryKeys } from "@/utils/queryKeys";

// Author-only actions on a post: pin (max 3), archive, delete, edit.
export function usePostOwnerActions() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;

  function invalidate(postId: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.profilePosts(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.profilePostCount(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.archivedPosts(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feedBase });
  }

  const pin = useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) => pinPost(postId, pinned),
    onSettled: (_d, _e, { postId }) => invalidate(postId),
  });
  const archive = useMutation({
    mutationFn: ({ postId, archived }: { postId: string; archived: boolean }) => archivePost(postId, archived),
    onSettled: (_d, _e, { postId }) => invalidate(postId),
  });
  const remove = useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSettled: (_d, _e, postId) => invalidate(postId),
  });
  const edit = useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost(input),
    onSettled: (_d, _e, input) => invalidate(input.postId),
  });

  return {
    pin: pin.mutateAsync,
    archive: archive.mutateAsync,
    remove: remove.mutateAsync,
    edit: edit.mutateAsync,
    isBusy: pin.isPending || archive.isPending || remove.isPending || edit.isPending,
  };
}
