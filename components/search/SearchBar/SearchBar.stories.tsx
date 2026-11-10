import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SearchBar } from "./SearchBar";

const meta = {
  title: "Search/SearchBar",
  component: SearchBar,
  args: {
    value: "",
    onChangeText: fn(),
  },
} satisfies Meta<typeof SearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
