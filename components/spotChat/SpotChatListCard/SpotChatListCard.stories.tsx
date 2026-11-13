import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { SpotChatListCard } from "./SpotChatListCard";

const meta = {
  title: "SpotChat/SpotChatListCard",
  component: SpotChatListCard,
  parameters: { frame: "block" },
  args: {
    chat: {
      roomId: SAMPLE_UUID,
      spotRef: { spotId: SAMPLE_UUID, osmSpotPlaceId: null },
      spotName: "Southbank Undercroft",
      isDiy: false,
      memberCount: 14,
      joinedAt: SAMPLE_DATE,
      lastMessageBody: "Anyone skating tonight?",
      lastMessageAt: SAMPLE_DATE,
      lastMessageIsMine: false,
      lastSenderName: "Jess",
      unreadCount: 2,
      muted: false,
    },
    onPress: fn(),
  },
} satisfies Meta<typeof SpotChatListCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unread: Story = {};

export const Read: Story = {
  args: { chat: { ...meta.args.chat, unreadCount: 0, lastMessageIsMine: true } },
};

export const Diy: Story = {
  args: { chat: { ...meta.args.chat, spotName: "Pallet Bowl", isDiy: true, memberCount: 1 } },
};

export const Empty: Story = {
  args: { chat: { ...meta.args.chat, lastMessageBody: null, lastMessageAt: null, lastSenderName: null, unreadCount: 0 } },
};

export const Muted: Story = {
  args: { chat: { ...meta.args.chat, muted: true, unreadCount: 0 } },
};
