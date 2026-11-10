import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { Text } from "react-native";

import { storyStyles } from "@/.rnstorybook/storyStyles";

import { ErrorBoundary } from "./ErrorBoundary";

const meta = {
  title: "Common/ErrorBoundary",
  component: ErrorBoundary,
  args: {
    // Real children are set in render: a JSX element in args breaks
    // Storybook's arg-type inference (it walks into React internals).
    children: null,
    onReset: fn(),
  },
  render: (args) => (
    <ErrorBoundary {...args}>
      <Text style={storyStyles.bodyText}>Children render normally until one of them throws.</Text>
    </ErrorBoundary>
  ),
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
