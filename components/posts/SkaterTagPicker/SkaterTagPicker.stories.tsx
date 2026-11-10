import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { SkaterTagPicker } from "./SkaterTagPicker";

const meta = {
  title: "Posts/SkaterTagPicker",
  component: SkaterTagPicker,
  args: {
    visible: false,
    selected: [{ profileId: "skater-1", username: "kickflip_kai" }],
    onChange: fn(),
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <SkaterTagPicker
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof SkaterTagPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
