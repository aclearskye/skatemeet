import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_AVATAR, SAMPLE_DATE, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { NotificationRow } from "./NotificationRow";

const meta = {
  title: "Notifications/NotificationRow",
  component: NotificationRow,
  args: {
    notification: {
      notificationId: SAMPLE_UUID,
      message: "kickflip_kai sent you a friend request",
      label: null,
      variant: "info",
      source: "friend_request",
      dedupKey: SAMPLE_UUID,
      relatedProfileId: SAMPLE_UUID,
      relatedProfile: { username: "kickflip_kai", displayName: "Kai", avatarUrl: SAMPLE_AVATAR },
      readAt: null,
      createdAt: SAMPLE_DATE,
    },
    onDelete: fn(),
    onRespond: fn(),
  },
} satisfies Meta<typeof NotificationRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
