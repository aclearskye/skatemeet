import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { MessageButton } from "./MessageButton";

const meta = {
  title: "Profile/MessageButton",
  component: MessageButton,
  parameters: { frame: "inline" },
  args: {
    profileId: SAMPLE_UUID,
    friendStatus: "friends",
  },
} satisfies Meta<typeof MessageButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Friends: Story = {};

export const NotFriends: Story = {
  args: {
    friendStatus: "none",
  },
};
