import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { TapeChip } from "./TapeChip";

const meta = {
  title: "Common/TapeChip",
  component: TapeChip,
  parameters: { frame: "inline" },
  args: {
    text: "Ledges",
    colors: { bg: C.primary, fg: C.onPrimary },
    size: "md",
  },
} satisfies Meta<typeof TapeChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const Large: Story = { args: { size: "lg" } };

export const Bone: Story = { args: { text: "Mon", colors: { bg: C.tape, fg: C.onTape } } };

export const Inactive: Story = { args: { active: false, onPress: fn() } };

export const Removable: Story = { args: { removable: true, onPress: fn() } };
