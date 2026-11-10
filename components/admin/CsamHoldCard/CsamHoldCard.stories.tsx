import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { CsamHoldCard } from "./CsamHoldCard";

const meta = {
  title: "Admin/CsamHoldCard",
  component: CsamHoldCard,
  args: {
    item: {
      holdId: SAMPLE_UUID,
      postId: SAMPLE_UUID,
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      ncaReportStatus: "to_file",
      ncaReference: null,
      createdAt: SAMPLE_DATE,
      filedAt: null,
    },
    onMarkFiled: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof CsamHoldCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
