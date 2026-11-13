import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { ChatHeader } from "./ChatHeader";

const meta = {
  title: "Chats/ChatHeader",
  component: ChatHeader,
  parameters: { frame: "edge" },
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
    topInset: 0,
    onBack: fn(),
    onOpenProfile: fn(),
    onClear: fn(),
    onDelete: fn(),
    onBlock: fn(),
  },
} satisfies Meta<typeof ChatHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
