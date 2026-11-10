import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { FacilitiesSelect } from "./FacilitiesSelect";

const meta = {
  title: "Common/EntityMetadataStep/FacilitiesSelect",
  component: FacilitiesSelect,
  args: {
    value: ["restrooms"],
    onChange: fn(),
    accent: C.primary,
    onAccent: C.onPrimary,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <FacilitiesSelect
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof FacilitiesSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
