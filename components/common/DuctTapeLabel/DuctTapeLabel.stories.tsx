import { Text } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { storyStyles } from "@/.rnstorybook/storyStyles";

import { DuctTapeLabel } from "./DuctTapeLabel";

const meta = {
  title: "Common/DuctTapeLabel",
  component: DuctTapeLabel,
  parameters: { frame: "inline" },
  args: {
    color: C.tape,
    children: "LEDGES",
  },
  // Like EntityTapeLabels: chip padding on the tape, mono text inside.
  render: ({ children, ...args }) => (
    <DuctTapeLabel {...args} style={storyStyles.tapeChip}>
      <Text style={[storyStyles.tapeText, { color: C.onTape }]}>{children}</Text>
    </DuctTapeLabel>
  ),
} satisfies Meta<typeof DuctTapeLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Static: Story = {};

export const Pressable: Story = {
  args: {
    color: C.primary,
    onPress: fn(),
  },
};
