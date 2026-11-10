import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { fetchSpotChatMessages } from "../queries";

// Only runs once the viewer is a member -- the RPC refuses anyone else.
export function useSpotChatMessages(roomId: string | null, isMember: boolean) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.spotChatMessages(roomId ?? ""),
    queryFn: ({ pageParam }) => fetchSpotChatMessages(roomId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!roomId && isMember,
  });

  // Pages are newest-first, so flattening keeps the inverted list's order.
  const messages = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return { ...query, messages };
}
