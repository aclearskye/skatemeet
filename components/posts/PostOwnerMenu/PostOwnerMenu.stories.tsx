import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_POST } from "@/.rnstorybook/fixtures";
import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { PostOwnerMenu } from "./PostOwnerMenu";

const meta = {
  title: "Posts/PostOwnerMenu",
  component: PostOwnerMenu,
  args: {
    post: SAMPLE_POST,
    visible: false,
    onClose: fn(),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <PostOwnerMenu
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof PostOwnerMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
