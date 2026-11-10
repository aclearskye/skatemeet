import type { Meta, StoryObj } from "@storybook/react-native";

import { C } from "@/lib/theme";

import { StarRating } from "./StarRating";

const meta = {
  title: "Common/StarRating",
  component: StarRating,
  parameters: { frame: "inline" },
  args: {
    rating: 3.5,
    count: 12,
    accent: C.primary,
  },
} satisfies Meta<typeof StarRating>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoRating: Story = {
  args: {
    rating: null,
    count: 0,
  },
};
