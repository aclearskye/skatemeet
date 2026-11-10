import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { REVIEW_REPORT_REASONS } from "@/lib/shared/types";

import { ReportReasonSheet } from "./ReportReasonSheet";

const meta = {
  title: "Common/ReportReasonSheet",
  component: ReportReasonSheet,
  parameters: { frame: "screen" },
  args: {
    title: "Report review",
    reasons: REVIEW_REPORT_REASONS,
    onSelect: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ReportReasonSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
