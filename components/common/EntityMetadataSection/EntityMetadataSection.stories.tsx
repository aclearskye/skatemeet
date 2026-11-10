import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_METADATA } from "@/.rnstorybook/fixtures";

import { EntityMetadataSection } from "./EntityMetadataSection";

const meta = {
  title: "Common/EntityMetadataSection",
  component: EntityMetadataSection,
  args: {
    metadata: SAMPLE_METADATA,
    isLoading: false,
    accent: C.primary,
    canEdit: true,
    onEdit: fn(),
  },
} satisfies Meta<typeof EntityMetadataSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    metadata: null,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
