import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { ProfileReportCard } from "./ProfileReportCard";

const meta = {
  title: "Admin/ProfileReportCard",
  component: ProfileReportCard,
  args: {
    item: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      isBanned: false,
      reportCount: 2,
      reasons: ["impersonation"],
      oldestReportAt: SAMPLE_DATE,
    },
    onDismiss: fn(),
    onBan: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof ProfileReportCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
