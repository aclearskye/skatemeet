import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_AVATAR } from "@/.rnstorybook/fixtures";

import { SpotChatAvatar } from "./SpotChatAvatar";

const meta = {
  title: "SpotChat/SpotChatAvatar",
  component: SpotChatAvatar,
  parameters: { frame: "inline" },
  args: {
    name: "Kai",
    avatarUrl: SAMPLE_AVATAR,
    size: 36,
  },
} satisfies Meta<typeof SpotChatAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPhoto: Story = {
  args: {
    avatarUrl: null,
  },
};
