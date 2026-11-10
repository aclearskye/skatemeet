import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { EditProfileSheet } from "./EditProfileSheet";

// Edits the signed-in profile from the auth context.
const meta = {
  title: "Profile/EditProfileSheet",
  component: EditProfileSheet,
  args: {
    visible: false,
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <EditProfileSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof EditProfileSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
