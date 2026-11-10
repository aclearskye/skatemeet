import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { ChatsEmptyState } from "./ChatsEmptyState";

const meta = {
  title: "Chats/ChatsEmptyState",
  component: ChatsEmptyState,
  parameters: { frame: "screen" },
  args: {
    onFindSkaters: fn(),
  },
} satisfies Meta<typeof ChatsEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
