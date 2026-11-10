import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { AddReviewSheet } from "./AddReviewSheet";

const meta = {
  title: "Common/AddReviewSheet",
  component: AddReviewSheet,
  args: {
    visible: false,
    onClose: fn(),
    accent: C.primary,
    onAccent: C.onPrimary,
    onSubmit: fn(async () => {}),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <AddReviewSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof AddReviewSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
