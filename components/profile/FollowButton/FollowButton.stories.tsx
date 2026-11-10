import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { FollowButton } from "./FollowButton";

// Reads the follow status from Supabase.
const meta = {
  title: "Profile/FollowButton",
  component: FollowButton,
  parameters: { frame: "inline" },
  args: {
    profileId: SAMPLE_UUID,
    username: "kickflip_kai",
  },
} satisfies Meta<typeof FollowButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
