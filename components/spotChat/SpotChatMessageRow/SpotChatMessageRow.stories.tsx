import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { SpotChatMessageRow } from "./SpotChatMessageRow";

const meta = {
  title: "SpotChat/SpotChatMessageRow",
  component: SpotChatMessageRow,
  args: {
    message: {
      messageId: SAMPLE_UUID,
      body: "Anyone at the spot right now?",
      createdAt: SAMPLE_DATE,
      isMine: false,
      isHeld: false,
      senderAlias: "alias-1",
      senderName: "Kai",
      senderAvatarUrl: SAMPLE_AVATAR,
    },
    showSender: true,
    onDeleteForMe: fn(),
    onReport: fn(),
    onBlock: fn(),
  },
} satisfies Meta<typeof SpotChatMessageRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FromOthers: Story = {};

export const Continuation: Story = {
  args: {
    showSender: false,
  },
};
