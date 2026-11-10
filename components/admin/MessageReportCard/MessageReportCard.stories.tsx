import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { MessageReportCard } from "./MessageReportCard";

const meta = {
  title: "Admin/MessageReportCard",
  component: MessageReportCard,
  args: {
    item: {
      reportId: SAMPLE_UUID,
      messageId: SAMPLE_UUID,
      senderId: SAMPLE_UUID,
      senderUsername: "kickflip_kai",
      senderBanned: false,
      reason: "harassment",
      details: "Kept messaging after I asked them to stop",
      createdAt: SAMPLE_DATE,
    },
    onDismiss: fn(),
    onRemove: fn(),
    onBan: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof MessageReportCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
