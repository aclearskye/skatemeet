import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_REVIEW } from "@/.rnstorybook/fixtures";
import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { ReviewsModal } from "./ReviewsModal";

const meta = {
  title: "Common/ReviewsModal",
  component: ReviewsModal,
  args: {
    visible: false,
    onClose: fn(),
    reviews: [SAMPLE_REVIEW, { ...SAMPLE_REVIEW, review_id: "review-2", heading: "Crusty but fun", rating: 3 }],
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
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <ReviewsModal
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof ReviewsModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
