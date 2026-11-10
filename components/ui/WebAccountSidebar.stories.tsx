import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native";

import { storyStyles } from "@/.rnstorybook/storyStyles";

import WebAccountSidebar from "./WebAccountSidebar";

// Built for the web layout; shows the signed-in account.
const meta = {
  title: "UI/WebAccountSidebar",
  component: WebAccountSidebar,
  parameters: { frame: "inline" },
  render: () => (
    <View style={storyStyles.tall}>
      <WebAccountSidebar />
    </View>
  ),
} satisfies Meta<typeof WebAccountSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
