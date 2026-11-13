import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SearchLocationButton } from "./SearchLocationButton";

const meta = {
  title: "Search/SearchLocationButton",
  component: SearchLocationButton,
  args: {
    label: "Current location",
    onPress: fn(),
  },
} satisfies Meta<typeof SearchLocationButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CurrentLocation: Story = {};

export const CustomCity: Story = {
  args: { label: "Barcelona, Catalonia, Spain" },
};
