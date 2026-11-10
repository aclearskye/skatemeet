import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { queryKeys } from "@/utils/queryKeys";

// Mounted only while a spot chat is open. The room row's revision is all
// that's broadcast (RLS limits it to members); on a bump the thread is
// refetched through get_spot_chat_messages, so message rows -- and their
// senders -- never travel over realtime.
export function useSpotChatRealtime(roomId: string | null, isMember: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId || !isMember) return;

    const channel = supabase
      .channel(`spot-chat:${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "spot_chat_rooms", filter: `room_id=eq.${roomId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, isMember, queryClient]);
}
