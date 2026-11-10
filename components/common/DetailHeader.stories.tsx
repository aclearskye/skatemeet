import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { DetailHeader } from "./DetailHeader";

const meta = {
  title: "Common/DetailHeader",
  component: DetailHeader,
  parameters: { frame: "edge" },
  args: {
    title: "Southbank Undercroft",
    accent: C.primary,
    isFavorited: false,
    onBack: fn(),
    onToggleFavorite: fn(),
  },
} satisfies Meta<typeof DetailHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Favorited: Story = {
  args: {
    isFavorited: true,
  },
};
