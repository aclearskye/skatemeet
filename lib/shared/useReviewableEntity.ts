import { useAuthContext } from "@/lib/context/use-auth-context";
import { ReviewReportReason } from "@/lib/shared/types";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ReviewBase = { review_id: string; upvote_count: number; is_verified: boolean };

export type ReviewPayload = { heading: string; rating: number | null; comment: string };

export type ReviewableEntityAdapter<TReview extends ReviewBase, TReviewWithProfile extends TReview> = {
  fetchReviews: (id: string | null, osmId: string | null) => Promise<TReviewWithProfile[]>;
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
  toggleReviewVote: (
    reviewId: string,
    userId: string
  ) => Promise<{ upvote_count: number; user_has_voted: boolean }>;
  getReviewVoteStatuses: (reviewIds: string[], userId: string) => Promise<Record<string, boolean>>;
  getReportStatuses: (reviewIds: string[], userId: string) => Promise<Record<string, boolean>>;
  createReview: (
    id: string | null,
    osmId: string | null,
    payload: ReviewPayload,
    userId: string
  ) => Promise<TReview>;
  report: (reviewId: string, reason: ReviewReportReason) => Promise<void>;
  deleteReview: (reviewId: string, userId: string) => Promise<void>;
};

export function useReviewableEntity<TReview extends ReviewBase, TReviewWithProfile extends TReview>(
  entityId: string | null,
  osmPlaceId: string | null,
  initialVoteCount: number,
  adapter: ReviewableEntityAdapter<TReview, TReviewWithProfile>,
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

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: [...queryKeyBase, "reviews"],
    queryFn: () => adapter.fetchReviews(entityId, osmPlaceId),
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

  const reviewIds = reviews.map((r) => r.review_id);
  const { data: reviewVotes = {} } = useQuery({
    queryKey: [...queryKeyBase, "reviewVotes"],
    queryFn: () => adapter.getReviewVoteStatuses(reviewIds, userId!),
    enabled: !!userId && reviewIds.length > 0,
  });

  const { data: reportStatuses = {} } = useQuery({
    queryKey: [...queryKeyBase, "reviewReports"],
    queryFn: () => adapter.getReportStatuses(reviewIds, userId!),
    enabled: !!userId && reviewIds.length > 0,
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
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profileFavorites(userId) });
      }
    },
  });

  const reviewUpvoteMutation = useMutation({
    mutationFn: (reviewId: string) => adapter.toggleReviewVote(reviewId, userId!),
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "reviews"] });
      await queryClient.cancelQueries({ queryKey: [...queryKeyBase, "reviewVotes"] });
      const prevReviews = queryClient.getQueryData<TReviewWithProfile[]>([...queryKeyBase, "reviews"]);
      const prevReviewVotes = queryClient.getQueryData<Record<string, boolean>>([
        ...queryKeyBase,
        "reviewVotes",
      ]);
      const optimistic = !(prevReviewVotes?.[reviewId] ?? false);
      queryClient.setQueryData(
        [...queryKeyBase, "reviewVotes"],
        (old: Record<string, boolean> | undefined) => ({ ...(old ?? {}), [reviewId]: optimistic })
      );
      queryClient.setQueryData(
        [...queryKeyBase, "reviews"],
        (old: TReviewWithProfile[] | undefined) =>
          (old ?? []).map((r) => {
            if (r.review_id !== reviewId) return r;
            const newCount = r.upvote_count + (optimistic ? 1 : -1);
            return { ...r, upvote_count: newCount, is_verified: newCount >= 3 };
          })
      );
      return { prevReviews, prevReviewVotes };
    },
    onError: (_err, _reviewId, context) => {
      queryClient.setQueryData([...queryKeyBase, "reviews"], context?.prevReviews);
      queryClient.setQueryData([...queryKeyBase, "reviewVotes"], context?.prevReviewVotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "reviews"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "reviewVotes"] });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: (payload: ReviewPayload) =>
      adapter.createReview(entityId, osmPlaceId, payload, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "reviews"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "reviewVotes"] });
      queryClient.invalidateQueries({ queryKey: [...queryKeyBase, "rating"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: ReviewReportReason }) =>
      adapter.report(reviewId, reason),
    onSuccess: (_result, { reviewId }) => {
      queryClient.setQueryData([...queryKeyBase, "reviewReports"], (old: Record<string, boolean> | undefined) => ({
        ...(old ?? {}),
        [reviewId]: true,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => adapter.deleteReview(reviewId, userId!),
    onSuccess: (_result, reviewId) => {
      queryClient.setQueryData(
        [...queryKeyBase, "reviews"],
        (old: TReviewWithProfile[] | undefined) => (old ?? []).filter((r) => r.review_id !== reviewId)
      );
    },
    onSettled: () => {
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

  function handleReviewUpvote(reviewId: string) {
    if (!userId) return;
    reviewUpvoteMutation.mutate(reviewId);
  }

  async function handleReviewSubmit(payload: ReviewPayload) {
    await createReviewMutation.mutateAsync(payload);
  }

  function handleReviewReport(reviewId: string, reason: ReviewReportReason) {
    if (!userId) return;
    reportMutation.mutate({ reviewId, reason });
  }

  function handleReviewDelete(reviewId: string) {
    if (!userId) return;
    deleteMutation.mutate(reviewId);
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
    reviews,
    isLoadingReviews,
    avgRating,
    reviewVotes,
    handleReviewUpvote,
    handleReviewSubmit,
    reportStatuses,
    handleReviewReport,
    isReportingReview: reportMutation.isPending,
    handleReviewDelete,
    isDeletingReview: deleteMutation.isPending,
  };
}
