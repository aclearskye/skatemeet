import { useQuery } from "@tanstack/react-query";
import { searchProfilesByUsername } from "@/lib/profiles/queries";
import { SEARCH_MIN_CHARS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

export function useProfileSearch(query: string) {
  const enabled = query.length >= SEARCH_MIN_CHARS;

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKeys.userSearch(query),
    queryFn: () => searchProfilesByUsername(query),
    enabled,
    staleTime: 60_000,
  });

  return { results, isSearching: enabled && isFetching, enabled };
}
