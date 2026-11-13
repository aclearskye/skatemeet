import { useQuery } from "@tanstack/react-query";
import { searchClaimableStores } from "@/lib/storeAccounts/queries";
import { useDebouncedValue } from "@/lib/shared/hooks/useDebouncedValue";
import { SEARCH_DEBOUNCE_MS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

const MIN_CHARS = 2;

// OSM and user-created stores a business can claim, by name.
export function useClaimableStoreSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const enabled = debounced.length >= MIN_CHARS;

  const { data = [], isFetching, isError } = useQuery({
    queryKey: queryKeys.claimableStoreSearch(debounced.toLowerCase()),
    queryFn: () => searchClaimableStores(debounced),
    enabled,
    staleTime: 60_000,
  });

  return { results: enabled ? data : [], isSearching: enabled && isFetching, isError: enabled && isError, enabled };
}
