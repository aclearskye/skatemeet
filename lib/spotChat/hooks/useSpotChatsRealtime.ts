import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { queryKeys } from "@/utils/queryKeys";
import { fetchMySpotChats } from "../queries";
import type { SpotChatListItem } from "../types";
import { useIncomingSpotChatBanner } from "./useIncomingSpotChatBanner";

type RoomRow = { room_id: string };

// Mounted once in app/_layout.tsx. RLS only delivers room rows the viewer
// is a member of, so a revision bump means activity in one of their spot
// chats: refresh the Chats tab list and, for a new message, show a banner.
// Message rows themselves never travel over realtime.
export function useSpotChatsRealtime() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  // Read through a ref so a new handler identity doesn't resubscribe.
  const showBanner = useIncomingSpotChatBanner();
  const showBannerRef = useRef(showBanner);
  showBannerRef.current = showBanner;

  useEffect(() => {
    if (!viewerId) return;
    const listKey = queryKeys.mySpotChats(viewerId);

    const channel = supabase
      .channel(`my-spot-chats:${viewerId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "spot_chat_rooms" }, async (payload) => {
        const roomId = (payload.new as RoomRow).room_id;
        const before = queryClient.getQueryData<SpotChatListItem[]>(listKey)?.find((c) => c.roomId === roomId);
        try {
          const fresh = await queryClient.fetchQuery({ queryKey: listKey, queryFn: fetchMySpotChats, staleTime: 0 });
          showBannerRef.current(before, fresh.find((c) => c.roomId === roomId));
        } catch {
          // The list refetches next time the Chats tab opens.
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, queryClient]);
}
