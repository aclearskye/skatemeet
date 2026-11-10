import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { MessageBubble } from "./MessageBubble";

const meta = {
  title: "Chats/MessageBubble",
  component: MessageBubble,
  args: {
    message: {
      messageId: SAMPLE_UUID,
      conversationId: SAMPLE_UUID,
      senderId: SAMPLE_UUID,
      kind: "text",
      body: "Session at the bowl later?",
      createdAt: SAMPLE_DATE,
    },
    isOwn: false,
    status: "read",
    onReport: fn(),
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Theirs: Story = {};

export const Own: Story = {
  args: {
    isOwn: true,
  },
};
