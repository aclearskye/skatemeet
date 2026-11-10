import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SpotRatingsSection } from "./SpotRatingsSection";

const meta = {
  title: "SpotDetail/SpotRatingsSection",
  component: SpotRatingsSection,
  args: {
    summaries: {
      rating: { average: 4.2, count: 9 },
      difficulty: { average: 3.4, count: 5 },
      smoothness: { average: 2.1, count: 4 },
    },
    mine: { rating: null, difficulty: null, smoothness: null },
    onRate: fn(),
    lockedReason: null,
  },
} satisfies Meta<typeof SpotRatingsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Rated: Story = { args: { mine: { rating: 5, difficulty: 3, smoothness: 2 } } };

export const Unrated: Story = {
  args: {
    summaries: {
      rating: { average: null, count: 0 },
      difficulty: { average: null, count: 0 },
      smoothness: { average: null, count: 0 },
    },
  },
};

export const Locked: Story = { args: { lockedReason: "CHECK IN TO RATE IT" } };
