import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { LocationPickingBar } from "./LocationPickingBar";

const meta = {
  title: "Map/LocationPickingBar",
  component: LocationPickingBar,
  parameters: { frame: "screen" },
  args: {
    hasPendingPin: true,
    bottom: 24,
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof LocationPickingBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PinDropped: Story = {};

export const NoPin: Story = {
  args: {
    hasPendingPin: false,
  },
};
