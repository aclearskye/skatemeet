import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_POST } from "@/.rnstorybook/fixtures";

import { PostViewer } from "./PostViewer";

const meta = {
  title: "Posts/PostViewer",
  component: PostViewer,
  parameters: { frame: "screen" },
  args: {
    posts: [SAMPLE_POST, { ...SAMPLE_POST, postId: "post-2", caption: "Second clip" }],
  },
} satisfies Meta<typeof PostViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
