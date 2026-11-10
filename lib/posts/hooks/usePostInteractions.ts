import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchLikedPostIds, fetchSavedPostIds } from "@/lib/posts/listQueries";
import { togglePostLike, togglePostSave } from "@/lib/posts/mutations";
import { queryKeys } from "@/utils/queryKeys";

// An optimistic like count, tied to the server count it was computed from:
// once the list refetches with a different count, the server value wins.
type LikeCountOverride = { base: number; value: number };

// Viewer's like/save state for a batch of visible posts, with optimistic
// toggles (heart and count). Logged-out viewers get empty sets (the UI
// routes them to sign in). Liking your own post counts like any other.
export function usePostInteractions(postIds: string[]) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const viewerId = session?.user.id ?? null;
  const likeKey = queryKeys.postLikeStatuses(viewerId ?? "", postIds);
  const saveKey = queryKeys.postSaveStatuses(viewerId ?? "", postIds);
  const [likeCounts, setLikeCounts] = useState<Record<string, LikeCountOverride>>({});

  const { data: liked = new Set<string>() } = useQuery({
    queryKey: likeKey,
    queryFn: () => fetchLikedPostIds(viewerId!, postIds),
    enabled: viewerId != null && postIds.length > 0,
  });
  const { data: saved = new Set<string>() } = useQuery({
    queryKey: saveKey,
    queryFn: () => fetchSavedPostIds(viewerId!, postIds),
    enabled: viewerId != null && postIds.length > 0,
  });

  function optimistic(key: readonly unknown[], postId: string) {
    const prev = queryClient.getQueryData<Set<string>>(key) ?? new Set<string>();
    const next = new Set(prev);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    queryClient.setQueryData(key, next);
    return prev;
  }

  const likeMutation = useMutation({
    mutationFn: togglePostLike,
    onMutate: (postId: string) => ({ prev: optimistic(likeKey, postId) }),
    onError: (_e, _id, ctx) => queryClient.setQueryData(likeKey, ctx?.prev),
    onSettled: (_d, _e, postId) => queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
  });

  const saveMutation = useMutation({
    mutationFn: togglePostSave,
    onMutate: (postId: string) => ({ prev: optimistic(saveKey, postId) }),
    onError: (_e, _id, ctx) => queryClient.setQueryData(saveKey, ctx?.prev),
    onSettled: () => {
      if (viewerId) queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts(viewerId) });
    },
  });

  function likeCount(postId: string, serverCount: number): number {
    const override = likeCounts[postId];
    return override && override.base === serverCount ? override.value : serverCount;
  }

  function toggleLike(postId: string, serverCount: number) {
    const shown = likeCount(postId, serverCount);
    const next = Math.max(0, shown + (liked.has(postId) ? -1 : 1));
    setLikeCounts((prev) => ({ ...prev, [postId]: { base: serverCount, value: next } }));
    likeMutation.mutate(postId, {
      onError: () => setLikeCounts((prev) => ({ ...prev, [postId]: { base: serverCount, value: shown } })),
    });
  }

  return {
    isSignedIn: viewerId != null,
    liked,
    saved,
    likeCount,
    toggleLike,
    toggleSave: (postId: string) => saveMutation.mutate(postId),
  };
}
