import { Text, View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { storyStyles } from "@/.rnstorybook/storyStyles";

import { SwipeableChatRow } from "./SwipeableChatRow";

const meta = {
  title: "Chats/SwipeableChatRow",
  component: SwipeableChatRow,
  parameters: { frame: "block" },
  args: {
    muted: false,
    onToggleMute: fn(),
    onDelete: fn(),
    children: (
      <View style={{ padding: 20, backgroundColor: C.bg }}>
        <Text style={[storyStyles.tapeText, { color: C.text }]}>SWIPE ME LEFT</Text>
      </View>
    ),
  },
} satisfies Meta<typeof SwipeableChatRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = { args: { muted: true } };
