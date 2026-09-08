import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EntityPhoto, PhotoReportReason } from "./types";

export type EntityPhotosAdapter<TPhoto extends EntityPhoto> = {
  fetchPhotos: (id: string | null, osmId: string | null) => Promise<TPhoto[]>;
  getVoteStatuses: (photoIds: string[], userId: string) => Promise<Record<string, 1 | -1>>;
  castVote: (photoId: string, voteValue: 1 | -1) => Promise<void>;
  getReportStatuses: (photoIds: string[], userId: string) => Promise<Record<string, boolean>>;
  report: (photoId: string, reason: PhotoReportReason) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
};

// A vote, report, or delete can change which photo is the cover (see
// sync_spot_cover_photo / sync_store_cover_photo triggers), so the map card
// always needs a refetch alongside the entity's own photo-related caches.
function invalidateMapMarkers(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.mapUserMarkersBase });
  queryClient.invalidateQueries({ queryKey: queryKeys.mapOsmMarkersBase });
}

function applyVote<TPhoto extends EntityPhoto>(
  photos: TPhoto[],
  photoId: string,
  from: 1 | -1 | undefined,
  to: 1 | -1 | undefined
): TPhoto[] {
  return photos.map((p) => {
    if (p.photo_id !== photoId) return p;
    let { upvote_count, downvote_count } = p;
    if (from === 1) upvote_count -= 1;
    if (from === -1) downvote_count -= 1;
    if (to === 1) upvote_count += 1;
    if (to === -1) downvote_count += 1;
    return { ...p, upvote_count, downvote_count };
  });
}

export function useEntityPhotos<TPhoto extends EntityPhoto>(
  id: string | null,
  osmId: string | null,
  adapter: EntityPhotosAdapter<TPhoto>,
  queryKeyBase: readonly unknown[]
) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const { data: photos = [], isLoading } = useQuery({
    queryKey: queryKeyBase,
    queryFn: () => adapter.fetchPhotos(id, osmId),
  });

  const photoIds = photos.map((p) => p.photo_id);
  const voteKey = [...queryKeyBase, "voteStatuses"];
  const reportKey = [...queryKeyBase, "reportStatuses"];

  const { data: voteStatuses = {} } = useQuery({
    queryKey: voteKey,
    queryFn: () => adapter.getVoteStatuses(photoIds, userId!),
    enabled: !!userId && photoIds.length > 0,
  });

  const { data: reportStatuses = {} } = useQuery({
    queryKey: reportKey,
    queryFn: () => adapter.getReportStatuses(photoIds, userId!),
    enabled: !!userId && photoIds.length > 0,
  });

  const voteMutation = useMutation({
    mutationFn: ({ photoId, voteValue }: { photoId: string; voteValue: 1 | -1 }) =>
      adapter.castVote(photoId, voteValue),
    onMutate: async ({ photoId, voteValue }) => {
      await queryClient.cancelQueries({ queryKey: queryKeyBase });
      await queryClient.cancelQueries({ queryKey: voteKey });
      const prevPhotos = queryClient.getQueryData<TPhoto[]>(queryKeyBase);
      const prevVotes = queryClient.getQueryData<Record<string, 1 | -1>>(voteKey);
      const existing = prevVotes?.[photoId];
      const next = existing === voteValue ? undefined : voteValue;

      queryClient.setQueryData(queryKeyBase, (old: TPhoto[] | undefined) =>
        applyVote(old ?? [], photoId, existing, next)
      );
      queryClient.setQueryData(voteKey, (old: Record<string, 1 | -1> | undefined) => {
        const copy = { ...(old ?? {}) };
        if (next === undefined) delete copy[photoId];
        else copy[photoId] = next;
        return copy;
      });
      return { prevPhotos, prevVotes };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKeyBase, context?.prevPhotos);
      queryClient.setQueryData(voteKey, context?.prevVotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyBase });
      queryClient.invalidateQueries({ queryKey: voteKey });
      invalidateMapMarkers(queryClient);
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ photoId, reason }: { photoId: string; reason: PhotoReportReason }) =>
      adapter.report(photoId, reason),
    onSuccess: (_result, { photoId }) => {
      queryClient.setQueryData(reportKey, (old: Record<string, boolean> | undefined) => ({
        ...(old ?? {}),
        [photoId]: true,
      }));
      // Enough reports auto-hides a photo, which can also change the cover.
      queryClient.invalidateQueries({ queryKey: queryKeyBase });
      invalidateMapMarkers(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => adapter.deletePhoto(photoId),
    onSuccess: (_result, photoId) => {
      queryClient.setQueryData(queryKeyBase, (old: TPhoto[] | undefined) =>
        (old ?? []).filter((p) => p.photo_id !== photoId)
      );
      // Deleting the current cover promotes the next-best photo (or clears it).
      invalidateMapMarkers(queryClient);
    },
  });

  return {
    photos,
    isLoading,
    voteStatuses,
    reportStatuses,
    castVote: (photoId: string, voteValue: 1 | -1) => voteMutation.mutate({ photoId, voteValue }),
    report: (photoId: string, reason: PhotoReportReason) => reportMutation.mutate({ photoId, reason }),
    isReporting: reportMutation.isPending,
    deletePhoto: (photoId: string) => deleteMutation.mutate(photoId),
    isDeleting: deleteMutation.isPending,
  };
}
