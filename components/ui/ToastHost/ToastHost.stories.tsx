import { Text, TouchableOpacity, View } from "react-native";

import type { Meta, StoryObj } from "@storybook/react-native";

import { ToastProvider, useToast, type ToastVariant } from "@/lib/context/toast-context";
import { storyStyles } from "@/.rnstorybook/storyStyles";

import { ToastHost } from "./ToastHost";

const VARIANTS: ToastVariant[] = ["success", "info", "danger"];

// Its own ToastProvider so these toasts don't mix with the story frame's.
function ToastTriggers() {
  const { showToast } = useToast();
  return (
    <View style={storyStyles.triggerRow}>
      {VARIANTS.map((variant) => (
        <TouchableOpacity
          key={variant}
          style={storyStyles.trigger}
          activeOpacity={0.85}
          onPress={() =>
            showToast({ message: `Something ${variant} happened`, label: variant.toUpperCase(), variant })
          }
        >
          <Text style={storyStyles.triggerText}>{variant.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
      <ToastHost />
    </View>
  );
}

const meta = {
  title: "UI/ToastHost",
  component: ToastHost,
  parameters: { frame: "screen" },
  render: () => (
    <ToastProvider>
      <ToastTriggers />
    </ToastProvider>
  ),
} satisfies Meta<typeof ToastHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
