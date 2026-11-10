import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { CategoryPickerOverlay } from "./CategoryPickerOverlay";

const meta = {
  title: "Map/CategoryPickerOverlay",
  component: CategoryPickerOverlay,
  parameters: { frame: "screen" },
  args: {
    bottom: 24,
    onSelectSpot: fn(),
    onSelectDiy: fn(),
    onSelectStore: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof CategoryPickerOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
