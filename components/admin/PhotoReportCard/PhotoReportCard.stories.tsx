import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DATE, SAMPLE_PHOTO, SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { PhotoReportCard } from "./PhotoReportCard";

const meta = {
  title: "Admin/PhotoReportCard",
  component: PhotoReportCard,
  args: {
    item: {
      photoId: SAMPLE_UUID,
      entityKind: "spot",
      mediaUrl: SAMPLE_PHOTO,
      reportCount: 3,
      reasons: ["spam", "not_a_spot"],
      oldestReportAt: SAMPLE_DATE,
    },
    onResolve: fn(),
    isBusy: false,
  },
} satisfies Meta<typeof PhotoReportCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
