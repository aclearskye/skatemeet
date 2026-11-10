import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
  title: "Common/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    visible: false,
    title: "Delete review?",
    message: "This can't be undone.",
    confirmLabel: "DELETE",
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <ConfirmDialog
          {...args}
          visible={visible}
          onCancel={closing(args.onCancel, close)}
          onConfirm={closing(args.onConfirm, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
