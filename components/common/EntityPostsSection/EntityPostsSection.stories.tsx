import type { Meta, StoryObj } from "@storybook/react-native";

import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { EntityPostsSection } from "./EntityPostsSection";

// Loads posts tagged with this entity from Supabase.
const meta = {
  title: "Common/EntityPostsSection",
  component: EntityPostsSection,
  parameters: { frame: "edge" },
  args: {
    tag: { kind: "spot", spotId: SAMPLE_UUID },
  },
} satisfies Meta<typeof EntityPostsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
