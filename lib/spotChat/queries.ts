import { supabase } from "@/lib/supabaseClient";
import { SPOT_CHAT_PAGE_SIZE, type SpotChatMessage, type SpotChatMessagePage, type SpotChatRoom, type SpotChatSpotRef } from "./types";

type RoomRow = {
  room_id: string | null;
  is_member: boolean;
  member_count: number;
  can_join: boolean;
};

export type SpotChatMessageRow = {
  message_id: string;
  body: string;
  created_at: string;
  is_mine: boolean;
  is_held: boolean;
  sender_alias: string | null;
  sender_name: string;
  sender_avatar_url: string | null;
};

export function toSpotChatMessage(row: SpotChatMessageRow): SpotChatMessage {
  return {
    messageId: row.message_id,
    body: row.body,
    createdAt: row.created_at,
    isMine: row.is_mine,
    isHeld: row.is_held,
    senderAlias: row.sender_alias,
    senderName: row.sender_name,
    senderAvatarUrl: row.sender_avatar_url,
  };
}

export async function fetchSpotChatRoom(ref: SpotChatSpotRef): Promise<SpotChatRoom> {
  const { data, error } = await supabase.rpc("get_spot_chat_room", {
    p_spot_id: ref.spotId,
    p_osm_spot_place_id: ref.osmSpotPlaceId,
  });
  if (error) throw error;
  const row = (data as RoomRow[])[0];
  return {
    roomId: row?.room_id ?? null,
    isMember: row?.is_member ?? false,
    memberCount: row?.member_count ?? 0,
    canJoin: row?.can_join ?? false,
  };
}

// Newest first, keyset-paged on created_at.
export async function fetchSpotChatMessages(roomId: string, before: string | null): Promise<SpotChatMessagePage> {
  const { data, error } = await supabase.rpc("get_spot_chat_messages", {
    p_room_id: roomId,
    p_before: before,
    p_limit: SPOT_CHAT_PAGE_SIZE,
  });
  if (error) throw error;

  const messages = (data as SpotChatMessageRow[]).map(toSpotChatMessage);
  return {
    messages,
    nextCursor: messages.length === SPOT_CHAT_PAGE_SIZE ? messages[messages.length - 1].createdAt : null,
  };
}
