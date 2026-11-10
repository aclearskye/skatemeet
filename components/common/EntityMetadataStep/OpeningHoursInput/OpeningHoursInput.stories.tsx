import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_METADATA } from "@/.rnstorybook/fixtures";

import { OpeningHoursInput } from "./OpeningHoursInput";

const meta = {
  title: "Common/EntityMetadataStep/OpeningHoursInput",
  component: OpeningHoursInput,
  args: {
    value: SAMPLE_METADATA.opening_hours!,
    onChange: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <OpeningHoursInput
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof OpeningHoursInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
