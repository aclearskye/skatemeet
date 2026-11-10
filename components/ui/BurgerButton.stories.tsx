import type { Meta, StoryObj } from "@storybook/react-native";

import BurgerButton from "./BurgerButton";

// Native only: renders nothing on web, where the app has no drawer.
const meta = {
  title: "UI/BurgerButton",
  component: BurgerButton,
  parameters: { frame: "inline" },
} satisfies Meta<typeof BurgerButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
