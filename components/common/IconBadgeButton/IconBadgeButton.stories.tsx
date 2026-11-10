import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { IconBadgeButton } from "./IconBadgeButton";

const meta = {
  title: "Common/IconBadgeButton",
  component: IconBadgeButton,
  parameters: { frame: "inline" },
  args: {
    icon: "notifications-outline",
    hasBadge: true,
    onPress: fn(),
  },
} satisfies Meta<typeof IconBadgeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithBadge: Story = {};

export const NoBadge: Story = {
  args: {
    hasBadge: false,
  },
};
