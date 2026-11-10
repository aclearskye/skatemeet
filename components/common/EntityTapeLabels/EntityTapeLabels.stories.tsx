import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { EntityTapeLabels } from "./EntityTapeLabels";

const meta = {
  title: "Common/EntityTapeLabels",
  component: EntityTapeLabels,
  args: {
    typeLabel: "STREET",
    typeColors: { bg: C.primary, fg: C.onPrimary },
    difficulty: 3,
    labels: [
      { text: "ledges", color: "tertiary" },
      { text: "covered", color: "gold" },
    ],
  },
} satisfies Meta<typeof EntityTapeLabels>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Removable: Story = {
  args: {
    onRemoveLabel: fn(),
  },
};
