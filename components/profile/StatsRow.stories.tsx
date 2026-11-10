import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import StatsRow from "./StatsRow";

const meta = {
  title: "Profile/StatsRow",
  component: StatsRow,
  parameters: { frame: "edge" },
  args: {
    spots: 12,
    posts: 48,
    followers: 230,
    onFollowersPress: fn(),
  },
} satisfies Meta<typeof StatsRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
