import type { Meta, StoryObj } from "@storybook/react-native";

import { SpotMarker } from "./SpotMarker";

const meta = {
  title: "Map/SpotMarker",
  component: SpotMarker,
  parameters: { frame: "inline" },
  args: {
    isDiy: false,
    selected: false,
  },
} satisfies Meta<typeof SpotMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spot: Story = {};

export const Diy: Story = {
  args: {
    isDiy: true,
  },
};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Live: Story = {
  args: {
    liveCount: 3,
  },
};
