import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { PhotoUploadButton } from "./PhotoUploadButton";

const meta = {
  title: "Common/PhotoUploadButton",
  component: PhotoUploadButton,
  parameters: { frame: "inline" },
  args: {
    onPick: fn(),
    isLoading: false,
    disabled: false,
    accent: C.primary,
    onAccent: C.onPrimary,
  },
} satisfies Meta<typeof PhotoUploadButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
