import type { Meta, StoryObj } from "@storybook/react-native";

import { SpotInfoBlock } from "./SpotInfoBlock";

const meta = {
  title: "SpotDetail/SpotInfoBlock",
  component: SpotInfoBlock,
  args: {
    description: "Banks, ledges and a lot of history.",
    address: "Belvedere Rd, London SE1",
  },
} satisfies Meta<typeof SpotInfoBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoDetails: Story = {
  args: {
    description: null,
    address: null,
  },
};
