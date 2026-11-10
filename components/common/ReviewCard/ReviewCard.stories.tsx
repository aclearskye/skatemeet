import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_REVIEW } from "@/.rnstorybook/fixtures";

import { ReviewCard } from "./ReviewCard";

const meta = {
  title: "Common/ReviewCard",
  component: ReviewCard,
  args: {
    review: SAMPLE_REVIEW,
    isVoted: false,
    accent: C.primary,
    onUpvote: fn(),
    currentUserId: null,
    hasReported: false,
    onReport: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ReviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Voted: Story = {
  args: {
    isVoted: true,
  },
};

export const OwnReview: Story = {
  args: {
    currentUserId: SAMPLE_REVIEW.profile_id,
  },
};
