import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { DateOfBirthInput } from "./DateOfBirthInput";

const meta = {
  title: "Common/DateOfBirthInput",
  component: DateOfBirthInput,
  args: {
    value: { day: "", month: "", year: "" },
    onChange: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <DateOfBirthInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof DateOfBirthInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
