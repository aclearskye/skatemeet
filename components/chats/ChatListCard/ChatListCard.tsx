import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatDisplayName, formatChatTime, messageStatus, type ChatListItem } from "@/lib/messages/types";
import { C } from "@/lib/theme";
import { ChatAvatar } from "@/components/chats/ChatAvatar";
import { AVATAR_SIZE, styles } from "./ChatListCard.styles";

type Props = {
  chat: ChatListItem;
  viewerId: string;
  onPress: () => void;
};

export function ChatListCard({ chat, viewerId, onPress }: Props) {
  const isSayHi = chat.conversationId == null;
  const hasUnread = chat.unreadCount > 0;
  const isOwnLast = chat.lastMessageSenderId === viewerId;
  const lastStatus =
    isOwnLast && chat.lastMessageId && chat.lastMessageAt
      ? messageStatus(
          {
            messageId: chat.lastMessageId,
            conversationId: chat.conversationId ?? "",
            senderId: viewerId,
            kind: "text",
            body: chat.lastMessageBody,
            createdAt: chat.lastMessageAt,
          },
          chat.otherLastReadAt
        )
      : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <ChatAvatar
        profileId={chat.otherProfileId}
        username={chat.otherUsername}
        displayName={chat.otherDisplayName}
        avatarUrl={chat.otherAvatarUrl}
        size={AVATAR_SIZE}
      />

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, chat.otherState === "unavailable" && styles.nameMuted]}
            numberOfLines={1}
          >
            {chatDisplayName(chat).toUpperCase()}
          </Text>
          {chat.otherState === "blocked_by_me" && (
            <Ionicons name="ban" size={13} color={C.secondary} accessibilityLabel="Blocked" />
          )}
          {chat.lastMessageAt && <Text style={styles.time}>{formatChatTime(chat.lastMessageAt)}</Text>}
        </View>

        {/* A cleared chat keeps its card but shows no preview at all --
            it never reverts to "Say hi". */}
        <View style={styles.bottomRow}>
          {isSayHi ? (
            <Text style={styles.sayHi}>Say Hi 👋</Text>
          ) : chat.lastMessageBody ? (
            <>
              {lastStatus && (
                <Ionicons
                  name={lastStatus === "read" ? "checkmark-done" : "checkmark"}
                  size={14}
                  color={lastStatus === "read" ? C.tertiary : C.muted}
                />
              )}
              <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                {chat.lastMessageBody}
              </Text>
            </>
          ) : (
            <View style={styles.preview} />
          )}
          {hasUnread && <View style={styles.unreadDot} accessibilityLabel={`${chat.unreadCount} unread`} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}
