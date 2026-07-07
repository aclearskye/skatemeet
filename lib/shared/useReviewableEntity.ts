import { useAuthContext } from "@/lib/context/use-auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CardBase = { card_id: string; upvote_count: number; is_verified: boolean };

export type CardPayload = { heading: string; rating: number | null; comment: string };

export type ReviewableEntityAdapter<TCard extends CardBase, TCardWithProfile extends TCard> = {
  fetchCards: (id: string | null, osmId: string | null) => Promise<TCardWithProfile[]>;
  fetchAverageRating: (
    id: string | null,
    osmId: string | null
  ) => Promise<{ average: number | null; count: number }>;
  getFavoriteStatus: (id: string | null, osmId: string | null, userId: string) => Promise<boolean>;
  toggleFavorite: (id: string | null, osmId: string | null, userId: string) => Promise<boolean>;
  getVoteStatus: (id: string | null, osmId: string | null, userId: string) => Promise<boolean>;
  getVoteCount: (id: string | null, osmId: string | null) => Promise<number>;
  toggleVote: (
    id: string | null,
    osmId: string | null,
    userId: string
  ) => Promise<{ upvote_count: number; user_has_voted: boolean }>;
  toggleCardVote: (
    cardId: string,
    userId: string
  ) => Promise<{ upvote_count: number; user_has_voted: boolean }>;
  getCardVoteStatuses: (cardIds: string[], userId: string) => Promise<Record<string, boolean>>;
  createCard: (
    id: string | null,
    osmId: string | null,
    payload: CardPayload,
    userId: string
  ) => Promise<TCard>;
};

export function useReviewableEntity<TCard extends CardBase, TCardWithProfile extends TCard>(
  entityId: string | null,
  osmPlaceId: string | null,
  initialVoteCount: number,
  adapter: ReviewableEntityAdapter<TCard, TCardWithProfile>,
  queryKeyBase: readonly unknown[],
  onVoteToggled?: (result: { upvote_count: number; user_has_voted: boolean }) => void
) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: userHasVoted = false, isLoading: isLoadingVote } = useQuery({
    queryKey: [...queryKeyBase, "voteStatus"],
    queryFn: () => adapter.getVoteStatus(entityId, osmPlaceId, userId!),
    enabled: !!userId,
  });

  const { data: localVoteCount = initialVoteCount } = useQuery({
    queryKey: [...queryKeyBase, "voteCount"],
    queryFn: () => adapter.getVoteCount(entityId, osmPlaceId),
    initialData: initialVoteCount,
  });

  const { data: cards = [], isLoading: isLoadingCards } = useQuery({
    queryKey: [...queryKeyBase, "cards"],
    queryFn: () => adapter.fetchCards(entityId, osmPlaceId),
  });

  const { data: avgRating = { average: null, count: 0 } } = useQuery({
    queryKey: [...queryKeyBase, "rating"],
    queryFn: () => adapter.fetchAverageRating(entityId, osmPlaceId),
  });

  const { data: isFavorited = false } = useQuery({
    queryKey: [...queryKeyBase, "favorite"],
    queryFn: () => adapter.getFavoriteStatus(entityId, osmPlaceId, userId!),
    enabled: !!userId,
  });

  const cardIds = cards.map((c) => c.card_id);
  const { data: cardVotes = {} } = useQuery({
    queryKey: [...queryKeyBase, "cardVotes"],
    queryFn: () => adapter.getCardVoteStatuses(cardIds, userId!),
    enabled: !!userId && cardIds.length > 0,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const voteMutation = useMutation({
    mutationFn: () => adapter.toggleVote(entityId, osmPlaceId, userId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "voteStatus"] });
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "voteCount"] });
      const prevStatus = queryClient.getQueryData<boolean>([...queryKeyBase, "voteStatus"]);
      const prevCount = queryClient.getQueryData<number>([...queryKeyBase, "voteCount"]);
      queryClient.setQueryData([...queryKeyBase, "voteStatus"], !prevStatus);
      queryClient.setQueryData(
        [...queryKeyBase, "voteCount"],
        (prevCount ?? initialVoteCount) + (!prevStatus ? 1 : -1)
      );
      return { prevStatus, prevCount };
    },
    onSuccess: (result) => {
      onVoteToggled?.(result);
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData([...queryKeyBase, "voteStatus"], context?.prevStatus);
      queryClient.setQueryData([...queryKeyBase, "voteCount"], context?.prevCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "voteStatus"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "voteCount"] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: () => adapter.toggleFavorite(entityId, osmPlaceId, userId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "favorite"] });
      const prev = queryClient.getQueryData<boolean>([...queryKeyBase, "favorite"]);
      queryClient.setQueryData([...queryKeyBase, "favorite"], !prev);
      return { prev };
    },
    onSuccess: (newState) => {
      queryClient.setQueryData([...queryKeyBase, "favorite"], newState);
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData([...queryKeyBase, "favorite"], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "favorite"] });
    },
  });

  const cardUpvoteMutation = useMutation({
    mutationFn: (cardId: string) => adapter.toggleCardVote(cardId, userId!),
    onMutate: async (cardId) => {
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "cards"] });
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "cardVotes"] });
      const prevCards = queryClient.getQueryData<TCardWithProfile[]>([...queryKeyBase, "cards"]);
      const prevCardVotes = queryClient.getQueryData<Record<string, boolean>>([
        ...queryKeyBase,
        "cardVotes",
      ]);
      const optimistic = !(prevCardVotes?.[cardId] ?? false);
      queryClient.setQueryData(
        [...queryKeyBase, "cardVotes"],
        (old: Record<string, boolean> | undefined) => ({ ...(old ?? {}), [cardId]: optimistic })
      );
      queryClient.setQueryData(
        [...queryKeyBase, "cards"],
        (old: TCardWithProfile[] | undefined) =>
          (old ?? []).map((c) => {
            if (c.card_id !== cardId) return c;
            const newCount = c.upvote_count + (optimistic ? 1 : -1);
            return { ...c, upvote_count: newCount, is_verified: newCount >= 3 };
          })
      );
      return { prevCards, prevCardVotes };
    },
    onError: (_err, _cardId, context) => {
      queryClient.setQueryData([...queryKeyBase, "cards"], context?.prevCards);
      queryClient.setQueryData([...queryKeyBase, "cardVotes"], context?.prevCardVotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "cards"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "cardVotes"] });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (payload: CardPayload) =>
      adapter.createCard(entityId, osmPlaceId, payload, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "cards"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "cardVotes"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "rating"] });
    },
  });

  // ── Wrapped handlers (same external API as before) ────────────────────────

  function handleVote() {
    if (!userId || voteMutation.isPending) return;
    voteMutation.mutate();
  }

  function handleFavorite() {
    if (!userId || favoriteMutation.isPending) return;
    favoriteMutation.mutate();
  }

  function handleCardUpvote(cardId: string) {
    if (!userId) return;
    cardUpvoteMutation.mutate(cardId);
  }

  async function handleCardSubmit(payload: CardPayload) {
    await createCardMutation.mutateAsync(payload);
  }

  return {
    userHasVoted,
    localVoteCount,
    isVoting: voteMutation.isPending,
    isLoadingVote,
    handleVote,
    isFavorited,
    isTogglingFav: favoriteMutation.isPending,
    handleFavorite,
    cards,
    isLoadingCards,
    avgRating,
    cardVotes,
    handleCardUpvote,
    handleCardSubmit,
  };
}
