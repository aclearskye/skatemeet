import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { createEmptyMetadataFormState } from "./metadataFormState";

import { EntityMetadataStep } from "./EntityMetadataStep";

const meta = {
  title: "Common/EntityMetadataStep",
  component: EntityMetadataStep,
  args: {
    value: createEmptyMetadataFormState(),
    onChange: fn(),
    accent: C.primary,
    onSkip: fn(),
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <EntityMetadataStep
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof EntityMetadataStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
