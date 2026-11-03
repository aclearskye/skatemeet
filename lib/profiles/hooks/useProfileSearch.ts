import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { searchProfilesByUsername } from "@/lib/profiles/queries";
import { SEARCH_MIN_CHARS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

export function useProfileSearch(query: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const enabled = query.length >= SEARCH_MIN_CHARS && viewerId != null;

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKeys.userSearch(viewerId ?? "", query),
    queryFn: () => searchProfilesByUsername(query, viewerId!),
    enabled,
    staleTime: 60_000,
  });

  return { results, isSearching: enabled && isFetching, enabled };
}
