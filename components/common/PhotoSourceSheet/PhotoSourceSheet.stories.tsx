import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { PhotoSourceSheet } from "./PhotoSourceSheet";

const meta = {
  title: "Common/PhotoSourceSheet",
  component: PhotoSourceSheet,
  args: {
    visible: false,
    accent: C.primary,
    onAccent: C.onPrimary,
    onPick: fn(),
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <PhotoSourceSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
          onPick={closing(args.onPick, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof PhotoSourceSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
