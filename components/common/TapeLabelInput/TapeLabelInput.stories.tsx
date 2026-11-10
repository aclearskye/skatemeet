import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { TapeLabelInput } from "./TapeLabelInput";

const meta = {
  title: "Common/TapeLabelInput",
  component: TapeLabelInput,
  args: {
    value: [{ text: "ledges", color: "primary" }],
    onChange: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <TapeLabelInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof TapeLabelInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
