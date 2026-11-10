import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { MapStatusScreen } from "./MapStatusScreen";

const meta = {
  title: "Map/MapStatusScreen",
  component: MapStatusScreen,
  parameters: { frame: "screen" },
  args: {
    kind: "loading",
    onRetry: fn(),
  },
} satisfies Meta<typeof MapStatusScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const Denied: Story = {
  args: {
    kind: "denied",
  },
};

export const Error: Story = {
  args: {
    kind: "error",
  },
};
