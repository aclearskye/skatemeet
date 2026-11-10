import type { Meta, StoryObj } from "@storybook/react-native";

import { ExpBar } from "./ExpBar";

const meta = {
  title: "Profile/ExpBar",
  component: ExpBar,
  args: {
    currentLevel: 4,
    levelTitle: "Ripper",
    xpIntoLevel: 320,
    xpForNextLevel: 500,
    isMaxLevel: false,
  },
} satisfies Meta<typeof ExpBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MaxLevel: Story = {
  args: {
    isMaxLevel: true,
  },
};

export const LevelUp: Story = {
  args: {
    didLevelUp: true,
  },
};
