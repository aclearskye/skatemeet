import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { CreateStoreSheet } from "./CreateStoreSheet";

const meta = {
  title: "Stores/CreateStoreSheet",
  component: CreateStoreSheet,
  args: {
    visible: false,
    onClose: fn(),
    onStoreCreated: fn(),
    initialCoordinates: { latitude: 51.5113, longitude: -0.1357 },
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <CreateStoreSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
          onStoreCreated={closing(args.onStoreCreated, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof CreateStoreSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
