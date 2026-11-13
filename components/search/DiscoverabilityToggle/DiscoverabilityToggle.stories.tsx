import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { DiscoverabilityToggle } from "./DiscoverabilityToggle";

const meta = {
  title: "Search/DiscoverabilityToggle",
  component: DiscoverabilityToggle,
  args: {
    isDiscoverable: true,
    isPrivate: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof DiscoverabilityToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Discoverable: Story = {};

export const Hidden: Story = {
  args: { isDiscoverable: false },
};

export const PrivateAccount: Story = {
  args: { isPrivate: true },
};
