import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_PHOTO } from "@/.rnstorybook/fixtures";

import { EntityHero } from "./EntityHero";

const meta = {
  title: "Common/EntityHero",
  component: EntityHero,
  parameters: { frame: "edge" },
  args: {
    photoUrl: SAMPLE_PHOTO,
    placeholderIcon: "image-outline",
    onPhotoPress: fn(),
    name: "Southbank Undercroft",
  },
} satisfies Meta<typeof EntityHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPhoto: Story = {
  args: {
    photoUrl: null,
  },
};
