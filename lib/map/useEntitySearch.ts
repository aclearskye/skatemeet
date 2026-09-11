import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { boundingBoxAround, coordinatesOf, dedupeById, haversineDistanceKm, type Coordinates } from "@/lib/map/types";
import { fetchOsmSpotsInBounds, fetchSpotsInBounds, searchOsmSpotsByName, searchUserSpotsByName } from "@/lib/spots/queries";
import { fetchOsmStoresInBounds, fetchUserStoresInBounds, searchOsmStoresByName, searchUserStoresByName } from "@/lib/stores/queries";
import { FilterKey, SEARCH_MIN_CHARS, SEARCH_NEARBY_RADIUS_KM, SEARCH_PAGE_SIZE } from "@/utils/constants";
import { filterVisibleMarkers, type RawMapData } from "@/utils/mapFilters";
import { queryKeys } from "@/utils/queryKeys";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type SortMode = "distance" | "upvotes" | null;

const EMPTY_RAW_DATA: RawMapData = { osmSpots: [], osmStores: [], userSpots: [], userStores: [] };

export function useEntitySearch(
  query: string,
  activeFilters: Set<FilterKey>,
  sortMode: SortMode,
  userLocation: Coordinates | null
) {
  const enabled = query.length >= SEARCH_MIN_CHARS;

  // Global name match, ranked by upvotes, paginated SEARCH_PAGE_SIZE rows per
  // table at a time — a term as common as "skate" can otherwise match far
  // more rows than are worth fetching (or sorting) up front. More pages load
  // as the results list is scrolled (see loadMore below).
  const {
    data: pages,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.entitySearch(query),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam * SEARCH_PAGE_SIZE;
      const [osmSpots, userSpots, osmStores, userStores] = await Promise.all([
        searchOsmSpotsByName(query, offset, SEARCH_PAGE_SIZE),
        searchUserSpotsByName(query, offset, SEARCH_PAGE_SIZE),
        searchOsmStoresByName(query, offset, SEARCH_PAGE_SIZE),
        searchUserStoresByName(query, offset, SEARCH_PAGE_SIZE),
      ]);
      return { osmSpots, osmStores, userSpots, userStores };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const gotFullPage =
        lastPage.osmSpots.length === SEARCH_PAGE_SIZE ||
        lastPage.userSpots.length === SEARCH_PAGE_SIZE ||
        lastPage.osmStores.length === SEARCH_PAGE_SIZE ||
        lastPage.userStores.length === SEARCH_PAGE_SIZE;
      return gotFullPage ? allPages.length : undefined;
    },
    enabled,
    staleTime: 60_000,
  });

  const data = useMemo<RawMapData>(() => {
    if (!pages) return EMPTY_RAW_DATA;
    return {
      osmSpots: pages.pages.flatMap((p) => p.osmSpots),
      osmStores: pages.pages.flatMap((p) => p.osmStores),
      userSpots: pages.pages.flatMap((p) => p.userSpots),
      userStores: pages.pages.flatMap((p) => p.userStores),
    };
  }, [pages]);

  // So this widens the pool with everything within SEARCH_NEARBY_RADIUS_KM of
  // the user regardless of upvotes, name-filtered client-side afterwards —
  // it's what actually makes "nearest" mean nearest. Not paginated: it's
  // already geographically bounded, and truncating it would undermine the
  // point (a genuinely nearby, unpopular match would risk getting cut again).
  const nearbyEnabled = enabled && userLocation !== null;

  const { data: nearbyData, isFetching: isFetchingNearby } = useQuery({
    // Only ever fetched (see `enabled` below) once userLocation is non-null;
    // the fallback here just keeps this a valid call when it's still null.
    queryKey: queryKeys.entitySearchNearby(query, userLocation ?? { lat: 0, lng: 0 }),
    queryFn: async () => {
      const bbox = boundingBoxAround(userLocation!, SEARCH_NEARBY_RADIUS_KM);
      const [osmSpots, userSpots, osmStores, userStores] = await Promise.all([
        fetchOsmSpotsInBounds(bbox),
        fetchSpotsInBounds(bbox),
        fetchOsmStoresInBounds(bbox),
        fetchUserStoresInBounds(bbox),
      ]);
      return { osmSpots, osmStores, userSpots, userStores };
    },
    enabled: nearbyEnabled,
    staleTime: 60_000,
  });

  const merged = useMemo<RawMapData>(() => {
    const nearby = nearbyData ?? EMPTY_RAW_DATA;
    return {
      osmSpots: dedupeById([...data.osmSpots, ...nearby.osmSpots], (s) => s.place_id),
      osmStores: dedupeById([...data.osmStores, ...nearby.osmStores], (s) => s.place_id),
      userSpots: dedupeById([...data.userSpots, ...nearby.userSpots], (s) => s.spot_id),
      userStores: dedupeById([...data.userStores, ...nearby.userStores], (s) => s.store_id),
    };
  }, [data, nearbyData]);

  const results = useMemo<PreviewItem[]>(() => {
    // The nearby set isn't name-filtered server-side, so filter here with the
    // real query — harmless re-check for the global set, which already was.
    const filtered = filterVisibleMarkers(merged, activeFilters, query);

    const items: PreviewItem[] = [
      ...filtered.visibleOsmStores.map((d) => ({ kind: "osm-store" as const, data: d })),
      ...filtered.visibleUserStores.map((d) => ({ kind: "user-store" as const, data: d })),
      ...filtered.visibleOsmSpots.map((d) => ({ kind: "osm-spot" as const, data: d })),
      ...filtered.visibleUserSpots.map((d) => ({ kind: "user-spot" as const, data: d })),
    ];

    if (sortMode === "upvotes") {
      items.sort((a, b) => b.data.upvote_count - a.data.upvote_count);
    } else if (sortMode === "distance" && userLocation) {
      items.sort(
        (a, b) =>
          haversineDistanceKm(userLocation, coordinatesOf(a.data)) -
          haversineDistanceKm(userLocation, coordinatesOf(b.data))
      );
    }

    return items;
  }, [merged, activeFilters, sortMode, userLocation, query]);

  return {
    results,
    isSearching: enabled && (isFetching || (nearbyEnabled && isFetchingNearby)) && !isFetchingNextPage,
    isLoadingMore: isFetchingNextPage,
    hasMore: enabled && !!hasNextPage,
    loadMore: fetchNextPage,
    enabled,
  };
}
