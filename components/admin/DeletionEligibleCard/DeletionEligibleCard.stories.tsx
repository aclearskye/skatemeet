import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { DeletionEligibleCard } from "./DeletionEligibleCard";

const meta = {
  title: "Admin/DeletionEligibleCard",
  component: DeletionEligibleCard,
  args: {
    item: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      banReason: "Harassment",
      bannedAt: SAMPLE_DATE,
      eligibleSince: SAMPLE_DATE,
    },
    onDelete: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof DeletionEligibleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
