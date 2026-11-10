import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { StarInput } from "./StarInput";

const meta = {
  title: "Common/StarInput",
  component: StarInput,
  parameters: { frame: "inline" },
  args: {
    value: 3,
    onChange: fn(),
    accent: C.primary,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <StarInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof StarInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
