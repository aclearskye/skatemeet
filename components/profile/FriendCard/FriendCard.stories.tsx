import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { FriendCard } from "./FriendCard";

const meta = {
  title: "Profile/FriendCard",
  component: FriendCard,
  args: {
    friend: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      avatarUrl: SAMPLE_AVATAR,
      disciplines: ["street", "park"],
      city: "London",
      isPrivate: false,
    },
    onViewProfile: fn(),
  },
} satisfies Meta<typeof FriendCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
