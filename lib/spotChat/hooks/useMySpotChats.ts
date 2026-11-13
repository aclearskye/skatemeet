import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMySpotChats } from "../queries";

// The spot chats the viewer has joined and not left, for the Chats tab.
export function useMySpotChats() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.mySpotChats(viewerId ?? ""),
    queryFn: fetchMySpotChats,
    enabled: viewerId != null,
  });
}
