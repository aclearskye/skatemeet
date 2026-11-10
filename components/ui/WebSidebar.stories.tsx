import { View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native";

import { storyStyles } from "@/.rnstorybook/storyStyles";

import WebSidebar from "./WebSidebar";

// Built for the web layout.
const meta = {
  title: "UI/WebSidebar",
  component: WebSidebar,
  parameters: { frame: "inline" },
  render: () => (
    <View style={storyStyles.tall}>
      <WebSidebar />
    </View>
  ),
} satisfies Meta<typeof WebSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
