import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import ProfileBadges from "./ProfileBadges";

const meta = {
  title: "Profile/ProfileBadges",
  component: ProfileBadges,
  args: {
    skillLevel: "intermediate",
    disciplines: ["street", "park"],
    pronouns: "they/them",
    labels: [
      { text: "goofy", color: "tertiary" },
      { text: "night-owl", color: "gold" },
    ],
  },
} satisfies Meta<typeof ProfileBadges>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wrapped: Story = {
  args: {
    wrap: true,
  },
};

export const Editable: Story = {
  args: {
    wrap: true,
    onRemoveLabel: fn(),
  },
};
