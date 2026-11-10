import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { BanUserSheet } from "./BanUserSheet";

const meta = {
  title: "Admin/BanUserSheet",
  component: BanUserSheet,
  args: {
    visible: false,
    username: "kickflip_kai",
    onClose: fn(),
    onSubmit: fn(async () => {}),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <BanUserSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof BanUserSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
