import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { ChatAvatar } from "./ChatAvatar";

const meta = {
  title: "Chats/ChatAvatar",
  component: ChatAvatar,
  parameters: { frame: "inline" },
  args: {
    profileId: SAMPLE_UUID,
    username: "kickflip_kai",
    displayName: "Kai",
    avatarUrl: SAMPLE_AVATAR,
    size: 48,
  },
} satisfies Meta<typeof ChatAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPhoto: Story = {
  args: {
    avatarUrl: null,
  },
};
