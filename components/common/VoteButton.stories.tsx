import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { VoteButton } from "./VoteButton";

const meta = {
  title: "Common/VoteButton",
  component: VoteButton,
  args: {
    count: 42,
    hasVoted: false,
    accent: C.primary,
    onAccent: C.onPrimary,
    onPress: fn(),
    isLoading: false,
    variant: "full",
  },
} satisfies Meta<typeof VoteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Pill: Story = {
  parameters: { frame: "inline" },
  args: {
    variant: "pill",
  },
};

export const Voted: Story = {
  args: {
    hasVoted: true,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
