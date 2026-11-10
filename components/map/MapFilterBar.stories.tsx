import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { FILTER_DEFINITIONS } from "@/utils/constants";

import { MapFilterBar } from "./MapFilterBar";

const meta = {
  title: "Map/MapFilterBar",
  component: MapFilterBar,
  parameters: { frame: "edge" },
  args: {
    filters: FILTER_DEFINITIONS,
    activeFilters: new Set(["spots", "stores"] as const),
    onToggle: fn(),
  },
} satisfies Meta<typeof MapFilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
