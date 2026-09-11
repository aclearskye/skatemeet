import { PreviewItem, SkeletonKind } from "@/components/map/MapPreviewCard";
import { getSpotVoteCount, getUserVoteStatus } from "@/lib/spots/queries";
import { getStoreVoteCount, getStoreVoteStatus } from "@/lib/stores/queries";
import { useCallback, useRef, useState } from "react";

export function useMarkerPreview(userId: string | null) {
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKind, setPreviewKind] = useState<SkeletonKind>("spot");
  const [initialHasVoted, setInitialHasVoted] = useState<boolean | null>(null);
  const lastMarkerPressAt = useRef(0);
  const previewRequestId = useRef(0);

  const dismissPreview = useCallback(() => {
    previewRequestId.current++;
    setPreviewItem(null);
    setPreviewLoading(false);
  }, []);

  const dismissIfStaleMapPress = useCallback(() => {
    if (Date.now() - lastMarkerPressAt.current > 150) {
      dismissPreview();
    }
  }, [dismissPreview]);

  const handleMarkerSelect = useCallback(
    async (item: PreviewItem) => {
      lastMarkerPressAt.current = Date.now();

      const requestId = ++previewRequestId.current;
      // Set to the raw (unenriched) item immediately, not null — MapMarkers
      // derives each marker's `selected` look from previewItem's kind/id, so
      // this is what makes the tapped marker toggle instantly instead of
      // waiting on the vote-count fetch below. The skeleton (gated on
      // previewLoading) covers the card itself until enriched data lands.
      setPreviewItem(item);
      setPreviewLoading(true);
      setPreviewKind(
        item.kind === "osm-store" || item.kind === "user-store"
          ? "store"
          : (item.kind === "user-spot" && item.data.type === "diy") ||
            (item.kind === "osm-spot" && item.data.spot_type === "diy")
          ? "diy"
          : "spot"
      );

      try {
        let enriched: PreviewItem;
        let voted: boolean | null = null;

        if (item.kind === "user-spot") {
          if (userId) {
            const [count, voteStatus] = await Promise.all([
              getSpotVoteCount(item.data.spot_id, null),
              getUserVoteStatus(item.data.spot_id, null, userId),
            ]);
            enriched = { kind: "user-spot", data: { ...item.data, upvote_count: count } };
            voted = voteStatus;
          } else {
            const count = await getSpotVoteCount(item.data.spot_id, null);
            enriched = { kind: "user-spot", data: { ...item.data, upvote_count: count } };
          }
        } else if (item.kind === "osm-spot") {
          if (userId) {
            const [count, voteStatus] = await Promise.all([
              getSpotVoteCount(null, item.data.place_id),
              getUserVoteStatus(null, item.data.place_id, userId),
            ]);
            enriched = { kind: "osm-spot", data: { ...item.data, upvote_count: count } };
            voted = voteStatus;
          } else {
            const count = await getSpotVoteCount(null, item.data.place_id);
            enriched = { kind: "osm-spot", data: { ...item.data, upvote_count: count } };
          }
        } else if (item.kind === "osm-store") {
          if (userId) {
            const [count, voteStatus] = await Promise.all([
              getStoreVoteCount(null, item.data.place_id),
              getStoreVoteStatus(null, item.data.place_id, userId),
            ]);
            enriched = { kind: "osm-store", data: { ...item.data, upvote_count: count } };
            voted = voteStatus;
          } else {
            const count = await getStoreVoteCount(null, item.data.place_id);
            enriched = { kind: "osm-store", data: { ...item.data, upvote_count: count } };
          }
        } else {
          // user-store
          if (userId) {
            const [count, voteStatus] = await Promise.all([
              getStoreVoteCount(item.data.store_id, null),
              getStoreVoteStatus(item.data.store_id, null, userId),
            ]);
            enriched = { kind: "user-store", data: { ...item.data, upvote_count: count } };
            voted = voteStatus;
          } else {
            const count = await getStoreVoteCount(item.data.store_id, null);
            enriched = { kind: "user-store", data: { ...item.data, upvote_count: count } };
          }
        }

        if (previewRequestId.current !== requestId) return;
        setPreviewItem(enriched!);
        setInitialHasVoted(voted);
        setPreviewLoading(false);
      } catch {
        if (previewRequestId.current !== requestId) return;
        setPreviewItem(item);
        setInitialHasVoted(userId ? false : null);
        setPreviewLoading(false);
      }
    },
    [userId]
  );

  return {
    previewItem,
    previewLoading,
    previewKind,
    initialHasVoted,
    handleMarkerSelect,
    dismissPreview,
    dismissIfStaleMapPress,
  };
}
