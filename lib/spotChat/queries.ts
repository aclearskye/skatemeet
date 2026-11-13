import { supabase } from "@/lib/supabaseClient";
import {
  SPOT_CHAT_PAGE_SIZE,
  type SpotChatListItem,
  type SpotChatMessage,
  type SpotChatMessagePage,
  type SpotChatRoom,
  type SpotChatSpotRef,
} from "./types";

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

type MySpotChatRow = {
  room_id: string;
  spot_id: string | null;
  osm_spot_place_id: string | null;
  spot_name: string;
  is_diy: boolean;
  member_count: number;
  joined_at: string;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_is_mine: boolean | null;
  last_sender_name: string | null;
  unread_count: number;
  muted: boolean;
};

// Every spot chat the viewer has joined and not left, most recent first.
export async function fetchMySpotChats(): Promise<SpotChatListItem[]> {
  const { data, error } = await supabase.rpc("get_my_spot_chats");
  if (error) throw error;
  return (data as MySpotChatRow[]).map((row) => ({
    roomId: row.room_id,
    spotRef: { spotId: row.spot_id, osmSpotPlaceId: row.osm_spot_place_id },
    spotName: row.spot_name,
    isDiy: row.is_diy,
    memberCount: row.member_count,
    joinedAt: row.joined_at,
    lastMessageBody: row.last_message_body,
    lastMessageAt: row.last_message_at,
    lastMessageIsMine: row.last_message_is_mine ?? false,
    lastSenderName: row.last_sender_name,
    unreadCount: row.unread_count,
    muted: row.muted ?? false,
  }));
}
