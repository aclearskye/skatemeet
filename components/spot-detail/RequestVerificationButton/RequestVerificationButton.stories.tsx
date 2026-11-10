import type { Meta, StoryObj } from "@storybook/react-native";

import { C } from "@/lib/theme";
import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { RequestVerificationButton } from "./RequestVerificationButton";

const meta = {
  title: "SpotDetail/RequestVerificationButton",
  component: RequestVerificationButton,
  parameters: { frame: "inline" },
  args: {
    spotId: SAMPLE_UUID,
    accent: C.primary,
  },
} satisfies Meta<typeof RequestVerificationButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
