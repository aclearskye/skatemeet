import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchOtherLastReadAt } from "../queries";

// The other member's read position, which drives ✓ / ✓✓ on own messages.
// useChatRealtime keeps it current while the thread is open.
export function useOtherLastReadAt(conversationId: string | undefined) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.chatReadReceipt(conversationId ?? ""),
    queryFn: () => fetchOtherLastReadAt(conversationId!, viewerId!),
    enabled: !!conversationId && viewerId != null,
  });
}
