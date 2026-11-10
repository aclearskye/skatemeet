import type { Meta, StoryObj } from "@storybook/react-native";

import { UploadProgressBar } from "./UploadProgressBar";

// Reads the upload queue context; renders nothing while the queue is empty.
const meta = {
  title: "Posts/UploadProgressBar",
  component: UploadProgressBar,
  parameters: { frame: "screen" },
} satisfies Meta<typeof UploadProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
