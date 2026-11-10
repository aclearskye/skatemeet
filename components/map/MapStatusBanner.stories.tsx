import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { MapStatusBanner } from "./MapStatusBanner";

const meta = {
  title: "Map/MapStatusBanner",
  component: MapStatusBanner,
  parameters: { frame: "screen" },
  args: {
    gettingLocation: false,
    tooZoomedOut: true,
    markersLoading: false,
    scanningMinimum: false,
    nothingVisible: false,
    dismissedEmpty: false,
    onDismiss: fn(),
    top: 16,
  },
} satisfies Meta<typeof MapStatusBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TooZoomedOut: Story = {};

export const Loading: Story = {
  args: {
    tooZoomedOut: false,
    markersLoading: true,
  },
};

export const NothingVisible: Story = {
  args: {
    tooZoomedOut: false,
    nothingVisible: true,
  },
};
