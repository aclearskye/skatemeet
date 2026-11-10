import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { ParkingSelect } from "./ParkingSelect";

const meta = {
  title: "Common/EntityMetadataStep/ParkingSelect",
  component: ParkingSelect,
  args: {
    value: "street",
    onChange: fn(),
    accent: C.primary,
    onAccent: C.onPrimary,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <ParkingSelect
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof ParkingSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
