import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_AVATAR, SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { BlockedSkaterRow } from "./BlockedSkaterRow";

const meta = {
  title: "Profile/BlockedSkaterRow",
  component: BlockedSkaterRow,
  args: {
    blocked: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      avatarUrl: SAMPLE_AVATAR,
      blockedAt: SAMPLE_DATE,
    },
  },
} satisfies Meta<typeof BlockedSkaterRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
