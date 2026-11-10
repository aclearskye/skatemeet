import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import SwitchToBusinessModal from "./SwitchToBusinessModal";

const meta = {
  title: "UI/SwitchToBusinessModal",
  component: SwitchToBusinessModal,
  args: {
    visible: false,
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <SwitchToBusinessModal
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof SwitchToBusinessModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
