import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { MessageComposer } from "./MessageComposer";

const meta = {
  title: "Chats/MessageComposer",
  component: MessageComposer,
  parameters: { frame: "edge" },
  args: {
    onSend: fn(),
    bottomInset: 0,
  },
} satisfies Meta<typeof MessageComposer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
