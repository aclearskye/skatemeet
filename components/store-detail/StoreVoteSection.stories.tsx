import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { StoreVoteSection } from "./StoreVoteSection";

const meta = {
  title: "StoreDetail/StoreVoteSection",
  component: StoreVoteSection,
  args: {
    count: 12,
    hasVoted: false,
    onPress: fn(),
    isLoading: false,
  },
} satisfies Meta<typeof StoreVoteSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Voted: Story = {
  args: {
    hasVoted: true,
  },
};
