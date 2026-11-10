import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_METADATA } from "@/.rnstorybook/fixtures";
import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { EditMetadataSheet } from "./EditMetadataSheet";

const meta = {
  title: "Common/EditMetadataSheet",
  component: EditMetadataSheet,
  args: {
    visible: false,
    onClose: fn(),
    initialValue: SAMPLE_METADATA,
    accent: C.primary,
    onAccent: C.onPrimary,
    onSubmit: fn(async () => {}),
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <EditMetadataSheet
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof EditMetadataSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
