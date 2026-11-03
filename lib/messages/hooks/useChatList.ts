import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMyChats } from "../queries";

export function useChatList() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.chatList(viewerId ?? ""),
    queryFn: fetchMyChats,
    enabled: viewerId != null,
  });
}
