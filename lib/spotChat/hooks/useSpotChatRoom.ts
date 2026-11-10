import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { fetchSpotChatRoom } from "../queries";
import { spotChatKey, type SpotChatSpotRef } from "../types";

export function useSpotChatRoom(ref: SpotChatSpotRef) {
  const { session } = useAuthContext();
  const spotKey = spotChatKey(ref);

  return useQuery({
    queryKey: queryKeys.spotChatRoom(spotKey),
    queryFn: () => fetchSpotChatRoom(ref),
    enabled: !!session && spotKey !== "",
  });
}
