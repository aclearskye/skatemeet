import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_REVIEW, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { SpotReviews } from "./SpotReviews";

const meta = {
  title: "SpotDetail/SpotReviews",
  component: SpotReviews,
  args: {
    reviews: [
      { ...SAMPLE_REVIEW, spot_id: SAMPLE_UUID, osm_place_id: null, report_count: 0 },
      { ...SAMPLE_REVIEW, review_id: "review-2", spot_id: SAMPLE_UUID, osm_place_id: null, report_count: 0, heading: "Crusty but fun", rating: 3 },
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
    accent: C.primary,
    onAccent: C.onPrimary,
    onAddReview: fn(),
    onSeeMore: fn(),
    canReview: true,
  },
} satisfies Meta<typeof SpotReviews>;

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
