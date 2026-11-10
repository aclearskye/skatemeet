import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { PinDropSheets } from "./PinDropSheets";

const meta = {
  title: "Map/PinDropSheets",
  component: PinDropSheets,
  args: {
    pendingPin: { latitude: 51.5069, longitude: -0.1167 },
    pinCategory: "spot",
    showCreateSpotSheet: true,
    showCreateStoreSheet: false,
    onCancel: fn(),
    onSpotCreated: fn(),
    onStoreCreated: fn(),
  },
  // The show* args pick which sheet the trigger opens.
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <PinDropSheets
          {...args}
          showCreateSpotSheet={visible && args.showCreateSpotSheet}
          showCreateStoreSheet={visible && args.showCreateStoreSheet}
          onCancel={closing(args.onCancel, close)}
          onSpotCreated={closing(args.onSpotCreated, close)}
          onStoreCreated={closing(args.onStoreCreated, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof PinDropSheets>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spot: Story = {};

export const Diy: Story = {
  args: {
    pinCategory: "diy",
  },
};

export const Store: Story = {
  args: {
    pinCategory: "store",
    showCreateSpotSheet: false,
    showCreateStoreSheet: true,
  },
};
