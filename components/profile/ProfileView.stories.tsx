import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_PROFILE } from "@/.rnstorybook/fixtures";

import ProfileView from "./ProfileView";

// Loads stats, XP and posts for the profile from Supabase.
const meta = {
  title: "Profile/ProfileView",
  component: ProfileView,
  parameters: { frame: "screen" },
  args: {
    profile: SAMPLE_PROFILE,
    isOwnProfile: false,
  },
} satisfies Meta<typeof ProfileView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OtherProfile: Story = {};

export const OwnProfile: Story = {
  args: {
    isOwnProfile: true,
  },
};
