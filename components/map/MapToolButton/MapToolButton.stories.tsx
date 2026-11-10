import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { MapToolButton } from "./MapToolButton";

const meta = {
  title: "Map/MapToolButton",
  component: MapToolButton,
  parameters: { frame: "inline" },
  args: {
    icon: "locate",
    onPress: fn(),
  },
} satisfies Meta<typeof MapToolButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
