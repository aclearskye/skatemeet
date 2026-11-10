import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { CreateSpotSheet } from "./CreateSpotSheet";

const meta = {
  title: "Spots/CreateSpotSheet",
  component: CreateSpotSheet,
  args: {
    visible: false,
    onClose: fn(),
    onSpotCreated: fn(),
    initialCoordinates: { latitude: 51.5069, longitude: -0.1167 },
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <CreateSpotSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
          onSpotCreated={closing(args.onSpotCreated, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof CreateSpotSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spot: Story = {};

export const Diy: Story = {
  args: {
    lockedType: "diy",
  },
};
