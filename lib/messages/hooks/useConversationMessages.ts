import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMessages } from "../queries";

export function useConversationMessages(conversationId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.chatMessages(conversationId ?? ""),
    queryFn: ({ pageParam }) => fetchMessages(conversationId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
  });

  // Pages are newest-first, so flattening keeps the inverted list's order.
  const messages = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return { ...query, messages };
}
