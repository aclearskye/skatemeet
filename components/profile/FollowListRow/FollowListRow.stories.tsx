import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { FollowListRow } from "./FollowListRow";

const meta = {
  title: "Profile/FollowListRow",
  component: FollowListRow,
  args: {
    item: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      avatarUrl: SAMPLE_AVATAR,
      isPrivate: false,
      viewerFollows: false,
    },
    isViewer: false,
  },
} satisfies Meta<typeof FollowListRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OwnFollowers: Story = {
  args: {
    onRemove: fn(),
  },
};
