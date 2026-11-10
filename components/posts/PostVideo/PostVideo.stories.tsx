import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_VIDEO } from "@/.rnstorybook/fixtures";
import { storyStyles } from "@/.rnstorybook/storyStyles";

import { PostVideo } from "./PostVideo";

// Resolves to PostVideo.web.tsx (hls.js) on web and expo-video on native.
const meta = {
  title: "Posts/PostVideo",
  component: PostVideo,
  parameters: { frame: "screen" },
  args: {
    uri: SAMPLE_VIDEO,
    isActive: true,
    isMuted: true,
    style: storyStyles.root,
  },
} satisfies Meta<typeof PostVideo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playing: Story = {};

export const Paused: Story = {
  args: {
    isPaused: true,
  },
};
