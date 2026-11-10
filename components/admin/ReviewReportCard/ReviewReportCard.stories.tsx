import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { ReviewReportCard } from "./ReviewReportCard";

const meta = {
  title: "Admin/ReviewReportCard",
  component: ReviewReportCard,
  args: {
    item: {
      reviewId: SAMPLE_UUID,
      entityKind: "store",
      heading: "Worst shop ever",
      comment: "Totally fake review text that got reported.",
      rating: 1,
      reportCount: 4,
      reasons: ["spam"],
      oldestReportAt: SAMPLE_DATE,
    },
    onResolve: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof ReviewReportCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
