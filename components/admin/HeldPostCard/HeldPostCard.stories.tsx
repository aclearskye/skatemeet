import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_PHOTO, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { HeldPostCard } from "./HeldPostCard";

const meta = {
  title: "Admin/HeldPostCard",
  component: HeldPostCard,
  args: {
    item: {
      postId: SAMPLE_UUID,
      profileId: SAMPLE_UUID,
      username: "kickflip_kai",
      mediaType: "photo",
      caption: "First try at the ledge",
      holdReason: "reports",
      isUrgent: false,
      createdAt: SAMPLE_DATE,
      reportCount: 2,
      reportReasons: ["spam", "inappropriate"],
      media: [
        { mediaId: SAMPLE_UUID, position: 0, bucket: "post-media", storagePath: null, mediaUrl: SAMPLE_PHOTO },
      ],
    },
    onApprove: fn(),
    onRemove: fn(),
    onSuspectedCsam: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof HeldPostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
