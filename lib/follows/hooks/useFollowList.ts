import { useInfiniteQuery } from "@tanstack/react-query";
import { FOLLOW_PAGE_SIZE, listFollows } from "@/lib/follows/queries";
import type { FollowDirection } from "@/lib/follows/types";
import { queryKeys } from "@/utils/queryKeys";

export function useFollowList(profileId: string, direction: FollowDirection, query: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.followList(profileId, direction, query),
    queryFn: ({ pageParam }) => listFollows(profileId, direction, query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === FOLLOW_PAGE_SIZE ? all.length * FOLLOW_PAGE_SIZE : undefined),
  });
}
