import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { ReportMessageSheet } from "./ReportMessageSheet";

const meta = {
  title: "Chats/ReportMessageSheet",
  component: ReportMessageSheet,
  args: {
    visible: false,
    blockOption: {
      title: "Also block kickflip_kai",
      description: "They won't be able to message you.",
    },
    onClose: fn(),
    onSubmit: fn(async () => {}),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <ReportMessageSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof ReportMessageSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithBlockOption: Story = {};

export const WithoutBlockOption: Story = {
  args: {
    blockOption: null,
  },
};
