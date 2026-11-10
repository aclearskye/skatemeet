import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import ProfileAvatar from "./ProfileAvatar";

const meta = {
  title: "Profile/ProfileAvatar",
  component: ProfileAvatar,
  parameters: { frame: "inline" },
  args: {
    profileId: SAMPLE_UUID,
    username: "kickflip_kai",
    displayName: "Kai",
    avatarUrl: SAMPLE_AVATAR,
    isOwnProfile: false,
    size: 96,
  },
} satisfies Meta<typeof ProfileAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPhoto: Story = {
  args: {
    avatarUrl: null,
  },
};

export const OwnProfile: Story = {
  args: {
    isOwnProfile: true,
    onAvatarUpdated: fn(),
  },
};
