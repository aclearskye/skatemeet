import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { EntityTagPicker } from "./EntityTagPicker";

// Searches nearby spots and stores via the device location and Supabase.
const meta = {
  title: "Posts/EntityTagPicker",
  component: EntityTagPicker,
  args: {
    visible: false,
    onSelect: fn(),
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <EntityTagPicker
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
          onSelect={closing(args.onSelect, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof EntityTagPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
