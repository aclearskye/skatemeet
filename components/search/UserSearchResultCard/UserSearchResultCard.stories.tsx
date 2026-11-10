import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { UserSearchResultCard } from "./UserSearchResultCard";

const meta = {
  title: "Search/UserSearchResultCard",
  component: UserSearchResultCard,
  args: {
    result: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      disciplines: ["street", "park"],
      city: "London",
      avatarUrl: SAMPLE_AVATAR,
      isPrivate: false,
    },
    onPress: fn(),
  },
} satisfies Meta<typeof UserSearchResultCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
