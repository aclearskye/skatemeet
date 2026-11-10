import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { ChatLockedBanner } from "./ChatLockedBanner";

const meta = {
  title: "Chats/ChatLockedBanner",
  component: ChatLockedBanner,
  parameters: { frame: "edge" },
  args: {
    reason: "not_friends",
    bottomInset: 0,
    onUnblock: fn(),
  },
} satisfies Meta<typeof ChatLockedBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotFriends: Story = {};

export const BlockedByMe: Story = {
  args: {
    reason: "blocked_by_me",
  },
};

export const Unavailable: Story = {
  args: {
    reason: "unavailable",
  },
};
