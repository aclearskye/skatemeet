import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { SpotVoteSection } from "./SpotVoteSection";

const meta = {
  title: "SpotDetail/SpotVoteSection",
  component: SpotVoteSection,
  args: {
    count: 42,
    hasVoted: false,
    accent: C.primary,
    onAccent: C.onPrimary,
    onPress: fn(),
    isLoading: false,
    showVerifyHint: false,
  },
} satisfies Meta<typeof SpotVoteSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Voted: Story = {
  args: {
    hasVoted: true,
  },
};

export const VerifyHint: Story = {
  args: {
    showVerifyHint: true,
  },
};
