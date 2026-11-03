import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchUnreadChatCount } from "../queries";

export function useUnreadChatCount() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.chatUnreadCount(viewerId ?? ""),
    queryFn: fetchUnreadChatCount,
    enabled: viewerId != null,
  });

  return unreadCount;
}
