import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { AddFriendButton } from "./AddFriendButton";

// Reads the friend status from Supabase.
const meta = {
  title: "Profile/AddFriendButton",
  component: AddFriendButton,
  parameters: { frame: "inline" },
  args: {
    profileId: SAMPLE_UUID,
    username: "kickflip_kai",
  },
} satisfies Meta<typeof AddFriendButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
