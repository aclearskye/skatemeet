import type { Meta, StoryObj } from "@storybook/react-native";

import { StoreInfoBlock } from "./StoreInfoBlock";

const meta = {
  title: "StoreDetail/StoreInfoBlock",
  component: StoreInfoBlock,
  args: {
    osmRating: 4.5,
    address: "Brewer St, London",
    hours: "Mon-Sat 10-7",
    phone: "+44 20 0000 0000",
    website: "https://example.com",
    description: "Decks, wheels, bearings and coffee.",
  },
} satisfies Meta<typeof StoreInfoBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Minimal: Story = {
  args: {
    osmRating: null,
    hours: null,
    phone: null,
    website: null,
    description: null,
  },
};
