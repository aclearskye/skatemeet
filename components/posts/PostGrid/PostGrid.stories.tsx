import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { PostGrid } from "./PostGrid";

// Loads posts for `source` from Supabase; with the sample id it shows the empty state.
const meta = {
  title: "Posts/PostGrid",
  component: PostGrid,
  parameters: { frame: "edge" },
  args: {
    source: `posts:${SAMPLE_UUID}`,
    emptyIcon: "images-outline",
    emptyLabel: "No posts yet",
  },
} satisfies Meta<typeof PostGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OwnProfile: Story = {
  args: {
    onCreatePost: fn(),
  },
};
