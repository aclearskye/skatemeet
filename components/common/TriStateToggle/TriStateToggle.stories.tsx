import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { TriStateToggle } from "./TriStateToggle";

const meta = {
  title: "Common/TriStateToggle",
  component: TriStateToggle,
  args: {
    label: "Pet friendly",
    value: null,
    onChange: fn(),
    accent: C.primary,
    onAccent: C.onPrimary,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <TriStateToggle
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof TriStateToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
