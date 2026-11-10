import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { PostComposer } from "./PostComposer";

const meta = {
  title: "Posts/PostComposer",
  component: PostComposer,
  parameters: { frame: "screen" },
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof PostComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
