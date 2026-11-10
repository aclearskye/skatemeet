import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_REVIEW, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { StoreReviews } from "./StoreReviews";

const meta = {
  title: "StoreDetail/StoreReviews",
  component: StoreReviews,
  args: {
    reviews: [
      { ...SAMPLE_REVIEW, store_id: SAMPLE_UUID, osm_place_id: null, report_count: 0 },
      { ...SAMPLE_REVIEW, review_id: "review-2", store_id: SAMPLE_UUID, osm_place_id: null, report_count: 0, heading: "Crusty but fun", rating: 3 },
    ],
    isLoading: false,
    interactions: {
      currentUserId: null,
      reviewVotes: {},
      reportStatuses: {},
      onUpvote: fn(),
      onReport: fn(),
      onDelete: fn(),
    },
    onAddReview: fn(),
    onSeeMore: fn(),
    canReview: true,
  },
} satisfies Meta<typeof StoreReviews>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    reviews: [],
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
