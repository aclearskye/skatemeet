import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_POST } from "@/.rnstorybook/fixtures";

import { PostSlide } from "./PostSlide";

const meta = {
  title: "Posts/PostSlide",
  component: PostSlide,
  parameters: { frame: "screen" },
  args: {
    post: SAMPLE_POST,
    height: 844,
    isActive: true,
    isMuted: true,
    onToggleMute: fn(),
    isSignedIn: true,
    isOwnPost: false,
    isLiked: false,
    likeCount: SAMPLE_POST.likeCount,
    isSaved: false,
    onToggleLike: fn(),
    onToggleSave: fn(),
    onReport: fn(),
  },
} satisfies Meta<typeof PostSlide>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OwnPost: Story = {
  args: {
    isOwnPost: true,
  },
};

export const LikedAndSaved: Story = {
  args: {
    isLiked: true,
    isSaved: true,
  },
};
