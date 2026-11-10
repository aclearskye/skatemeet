import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { MapSearchBar } from "./MapSearchBar";

const meta = {
  title: "Map/MapSearchBar",
  component: MapSearchBar,
  args: {
    value: "",
    onChangeText: fn(),
  },
} satisfies Meta<typeof MapSearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
