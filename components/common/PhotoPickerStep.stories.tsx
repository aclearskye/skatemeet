import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_PHOTO } from "@/.rnstorybook/fixtures";

import { PhotoPickerStep } from "./PhotoPickerStep";

const meta = {
  title: "Common/PhotoPickerStep",
  component: PhotoPickerStep,
  args: {
    photoUri: null,
    onPick: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof PhotoPickerStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithPhoto: Story = {
  args: {
    photoUri: SAMPLE_PHOTO,
  },
};

export const WithError: Story = {
  args: {
    errorMsg: "That photo is too large.",
  },
};
