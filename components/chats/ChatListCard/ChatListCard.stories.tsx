import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { ChatListCard } from "./ChatListCard";

const meta = {
  title: "Chats/ChatListCard",
  component: ChatListCard,
  args: {
    chat: {
      conversationId: SAMPLE_UUID,
      otherProfileId: SAMPLE_UUID,
      otherUsername: "kickflip_kai",
      otherDisplayName: "Kai",
      otherAvatarUrl: SAMPLE_AVATAR,
      otherState: "active",
      otherLastReadAt: SAMPLE_DATE,
      lastMessageId: SAMPLE_UUID,
      lastMessageBody: "Session at the bowl later?",
      lastMessageSenderId: SAMPLE_UUID,
      lastMessageAt: SAMPLE_DATE,
      unreadCount: 2,
      canMessage: true,
      muted: false,
    },
    viewerId: "viewer-id",
    onPress: fn(),
  },
} satisfies Meta<typeof ChatListCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = {
  args: { chat: { ...meta.args.chat, muted: true } },
};
