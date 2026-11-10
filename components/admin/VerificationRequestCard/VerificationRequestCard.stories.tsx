import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_PHOTO, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { VerificationRequestCard } from "./VerificationRequestCard";

const meta = {
  title: "Admin/VerificationRequestCard",
  component: VerificationRequestCard,
  args: {
    item: {
      requestId: SAMPLE_UUID,
      spotId: SAMPLE_UUID,
      spotName: "Southbank Undercroft",
      spotPhotoUrl: SAMPLE_PHOTO,
      requestedBy: SAMPLE_UUID,
      requestedByUsername: "kickflip_kai",
      requestedAt: SAMPLE_DATE,
    },
    onApprove: fn(),
    onReject: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof VerificationRequestCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
