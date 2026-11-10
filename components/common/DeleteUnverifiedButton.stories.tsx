import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { DeleteUnverifiedButton } from "./DeleteUnverifiedButton";

const meta = {
  title: "Common/DeleteUnverifiedButton",
  component: DeleteUnverifiedButton,
  parameters: { frame: "inline" },
  args: {
    entityLabel: "spot",
    onDelete: fn(async () => {}),
  },
} satisfies Meta<typeof DeleteUnverifiedButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
