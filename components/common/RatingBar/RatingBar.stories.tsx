import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";

import { C } from "@/lib/theme";

import { RatingBar } from "./RatingBar";

const meta = {
  title: "Common/RatingBar",
  component: RatingBar,
  parameters: { frame: "inline" },
  args: {
    value: 3,
    accent: C.primary,
    label: "DIFFICULTY",
    count: 12,
  },
} satisfies Meta<typeof RatingBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartialAverage: Story = { args: { value: 3.4 } };

export const Unrated: Story = { args: { value: null, count: undefined } };

export const Small: Story = { args: { size: "sm", label: undefined, count: undefined } };

export const Store: Story = {
  args: { accent: C.secondary, label: "COMMUNITY RATING", value: 4.2 },
};

function InputRender(args: React.ComponentProps<typeof RatingBar>) {
  const [value, setValue] = useState<number | null>(null);
  return <RatingBar {...args} value={value} onChange={setValue} />;
}

export const Input: Story = {
  args: { label: undefined, count: undefined },
  render: (args) => <InputRender {...args} />,
};
