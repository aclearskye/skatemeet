import { useAuthContext } from "@/lib/context/use-auth-context";
import { useEffect, useState } from "react";

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
  onVoteToggled?: (result: { upvote_count: number; user_has_voted: boolean }) => void
) {
  const { session } = useAuthContext();

  const [userHasVoted, setUserHasVoted] = useState(false);
  const [localVoteCount, setLocalVoteCount] = useState(initialVoteCount);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoadingVote, setIsLoadingVote] = useState(true);

  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [cards, setCards] = useState<TCardWithProfile[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [avgRating, setAvgRating] = useState<{ average: number | null; count: number }>({
    average: null,
    count: 0,
  });
  const [cardVotes, setCardVotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!session) return;

    adapter
      .getVoteStatus(entityId, osmPlaceId, session.user.id)
      .then(setUserHasVoted)
      .catch(() => {})
      .finally(() => setIsLoadingVote(false));

    adapter
      .getVoteCount(entityId, osmPlaceId)
      .then(setLocalVoteCount)
      .catch(() => {});

    Promise.all([
      adapter.fetchCards(entityId, osmPlaceId),
      adapter.fetchAverageRating(entityId, osmPlaceId),
      adapter.getFavoriteStatus(entityId, osmPlaceId, session.user.id),
    ])
      .then(([fetchedCards, rating, fav]) => {
        setCards(fetchedCards);
        setAvgRating(rating);
        setIsFavorited(fav);
        if (fetchedCards.length > 0) {
          adapter
            .getCardVoteStatuses(fetchedCards.map((c) => c.card_id), session.user.id)
            .then(setCardVotes)
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCards(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVote() {
    if (!session || isVoting) return;
    setIsVoting(true);
    try {
      const result = await adapter.toggleVote(entityId, osmPlaceId, session.user.id);
      setUserHasVoted(result.user_has_voted);
      setLocalVoteCount(result.upvote_count);
      onVoteToggled?.(result);
    } catch {
    } finally {
      setIsVoting(false);
    }
  }

  async function handleFavorite() {
    if (isTogglingFav || !session) return;
    setIsTogglingFav(true);
    setIsFavorited((prev) => !prev);
    try {
      const newState = await adapter.toggleFavorite(entityId, osmPlaceId, session.user.id);
      setIsFavorited(newState);
    } catch {
      setIsFavorited((prev) => !prev);
    } finally {
      setIsTogglingFav(false);
    }
  }

  async function handleCardUpvote(cardId: string) {
    if (!session) return;
    const optimistic = !cardVotes[cardId];
    setCardVotes((prev) => ({ ...prev, [cardId]: optimistic }));
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_id !== cardId) return c;
        const newCount = c.upvote_count + (optimistic ? 1 : -1);
        return { ...c, upvote_count: newCount, is_verified: newCount >= 3 };
      })
    );
    try {
      await adapter.toggleCardVote(cardId, session.user.id);
    } catch {
      setCardVotes((prev) => ({ ...prev, [cardId]: !optimistic }));
    }
  }

  function handleCardCreated(card: TCard) {
    const cardWithProfile = {
      ...card,
      profiles: { username: session!.user.email ?? "you", display_name: null },
    } as unknown as TCardWithProfile;
    setCards((prev) => [cardWithProfile, ...prev]);
    adapter
      .fetchAverageRating(entityId, osmPlaceId)
      .then(setAvgRating)
      .catch(() => {});
  }

  async function handleCardSubmit(payload: CardPayload) {
    const card = await adapter.createCard(entityId, osmPlaceId, payload, session!.user.id);
    handleCardCreated(card);
  }

  return {
    userHasVoted,
    localVoteCount,
    isVoting,
    isLoadingVote,
    handleVote,
    isFavorited,
    isTogglingFav,
    handleFavorite,
    cards,
    isLoadingCards,
    avgRating,
    cardVotes,
    handleCardUpvote,
    handleCardSubmit,
  };
}
