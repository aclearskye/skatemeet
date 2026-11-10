import type { Meta, StoryObj } from "@storybook/react-native";

import { StoreMarker } from "./StoreMarker";

const meta = {
  title: "Map/StoreMarker",
  component: StoreMarker,
  parameters: { frame: "inline" },
  args: {
    selected: false,
  },
} satisfies Meta<typeof StoreMarker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
