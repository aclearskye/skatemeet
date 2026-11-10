import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { UserSearchResultCard } from "./UserSearchResultCard";

const meta = {
  title: "Admin/UserSearchResultCard",
  component: UserSearchResultCard,
  args: {
    result: {
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      displayName: "Kai",
      isAdmin: false,
      isBanned: false,
    },
    onBan: fn(),
    onUnban: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof UserSearchResultCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
