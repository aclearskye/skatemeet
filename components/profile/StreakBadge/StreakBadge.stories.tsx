import type { Meta, StoryObj } from "@storybook/react-native";

import { StreakBadge } from "./StreakBadge";

const meta = {
  title: "Profile/StreakBadge",
  component: StreakBadge,
  parameters: { frame: "inline" },
  args: {
    currentStreak: 7,
  },
} satisfies Meta<typeof StreakBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
