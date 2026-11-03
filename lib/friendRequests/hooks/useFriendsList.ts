import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMyFriends } from "../queries";

export function useFriendsList() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;

  return useQuery({
    queryKey: queryKeys.friendsList(viewerId ?? ""),
    queryFn: fetchMyFriends,
    enabled: viewerId != null,
  });
}
