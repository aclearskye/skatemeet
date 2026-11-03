import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { fetchChatSummary } from "../queries";

export function useChatSummary(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chatSummary(conversationId ?? ""),
    queryFn: () => fetchChatSummary(conversationId!),
    enabled: !!conversationId,
  });
}
