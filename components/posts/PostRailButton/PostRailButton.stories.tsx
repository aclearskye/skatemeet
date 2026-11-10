import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { PostRailButton } from "./PostRailButton";

const meta = {
  title: "Posts/PostRailButton",
  component: PostRailButton,
  parameters: { frame: "inline" },
  args: {
    icon: "heart-outline",
    activeIcon: "heart",
    isActive: false,
    accent: C.secondary,
    onAccent: C.onSecondary,
    count: 24,
    onPress: fn(),
    accessibilityLabel: "Like",
  },
} satisfies Meta<typeof PostRailButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    isActive: true,
  },
};
