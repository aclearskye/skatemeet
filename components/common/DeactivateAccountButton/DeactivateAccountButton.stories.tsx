import type { Meta, StoryObj } from "@storybook/react-native";

import { DeactivateAccountButton } from "./DeactivateAccountButton";

const meta = {
  title: "Common/DeactivateAccountButton",
  component: DeactivateAccountButton,
  parameters: { frame: "inline" },
} satisfies Meta<typeof DeactivateAccountButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
