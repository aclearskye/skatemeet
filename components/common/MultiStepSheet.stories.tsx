import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { Text } from "react-native";

import { C } from "@/lib/theme";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";
import { storyStyles } from "@/.rnstorybook/storyStyles";

import { MultiStepSheet } from "./MultiStepSheet";

const meta = {
  title: "Common/MultiStepSheet",
  component: MultiStepSheet,
  args: {
    visible: false,
    onClose: fn(),
    title: "ADD SPOT",
    accent: C.primary,
    onAccent: C.onPrimary,
    step: 1,
    totalSteps: 3,
    onBack: fn(),
    onNext: fn(),
    onSubmit: fn(),
    isSubmitting: false,
    isCurrentStepValid: true,
    // Real children are set in render: a JSX element in args breaks
    // Storybook's arg-type inference (it walks into React internals).
    children: null,
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <MultiStepSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
          onSubmit={closing(args.onSubmit, close)}
        >
          <Text style={storyStyles.bodyText}>Step content</Text>
        </MultiStepSheet>
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof MultiStepSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
