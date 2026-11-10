import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { BanAppealCard } from "./BanAppealCard";

const meta = {
  title: "Admin/BanAppealCard",
  component: BanAppealCard,
  args: {
    item: {
      appealId: SAMPLE_UUID,
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      banReason: "Spamming spot reviews",
      bannedAt: SAMPLE_DATE,
      testimony: "Sorry, I thought the reviews were for different spots. Won't happen again.",
      submittedAt: SAMPLE_DATE,
    },
    onDecision: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof BanAppealCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
