import type { Meta, StoryObj } from "@storybook/react-native";

import { LikeBurst } from "./LikeBurst";

// Change `trigger` to replay the burst.
const meta = {
  title: "Posts/LikeBurst",
  component: LikeBurst,
  parameters: { frame: "screen" },
  args: {
    trigger: 1,
  },
} satisfies Meta<typeof LikeBurst>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
