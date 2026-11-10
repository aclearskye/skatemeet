import type { Meta, StoryObj } from "@storybook/react-native";

import Header from "./Header";

const meta = {
  title: "UI/Header",
  component: Header,
  parameters: { frame: "edge" },
  args: {
    title: "SPOTS",
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {};

export const LogoOnly: Story = {
  args: {
    title: undefined,
  },
};
