import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { PrivateProfileView } from "./PrivateProfileView";

const meta = {
  title: "Profile/PrivateProfileView",
  component: PrivateProfileView,
  parameters: { frame: "screen" },
  args: {
    card: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      avatarUrl: SAMPLE_AVATAR,
      isPrivate: true,
    },
  },
} satisfies Meta<typeof PrivateProfileView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
