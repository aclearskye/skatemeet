import { useQuery } from "@tanstack/react-query";
import { searchPlaces } from "@/lib/geocoding/queries";
import { PlaceSearchRateLimitedError, type PlaceSearchKind } from "@/lib/geocoding/types";
import { useDebouncedValue } from "@/lib/shared/hooks/useDebouncedValue";
import { PLACE_SEARCH_MIN_CHARS, SEARCH_DEBOUNCE_MS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

// City search for the search-location modal (or address search for Store
// onboarding), debounced so each keystroke doesn't hit the geocoder.
export function usePlaceSearch(query: string, kind: PlaceSearchKind = "place") {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = debounced.length >= PLACE_SEARCH_MIN_CHARS;

  const { data: results = [], isFetching, isError, error } = useQuery({
    queryKey: queryKeys.placeSearch(debounced.toLowerCase(), kind),
    queryFn: () => searchPlaces(debounced, kind),
    enabled,
    staleTime: 60 * 60_000,
    // Retrying a rate limit only uses up more of it.
    retry: (failureCount, err) => !(err instanceof PlaceSearchRateLimitedError) && failureCount < 2,
  });

  return {
    results: enabled ? results : [],
    isSearching: enabled && isFetching,
    isError: enabled && isError,
    isRateLimited: enabled && error instanceof PlaceSearchRateLimitedError,
    enabled,
  };
}
