import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { SpotLabelsInput } from "./SpotLabelsInput";

const meta = {
  title: "Spots/SpotLabelsInput",
  component: SpotLabelsInput,
  args: {
    value: [{ text: "ledges", color: "tertiary" }],
    onChange: fn(),
    typeLabel: "STREET",
    typeColors: { bg: C.primary, fg: C.onPrimary },
    difficulty: 3,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <SpotLabelsInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof SpotLabelsInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
