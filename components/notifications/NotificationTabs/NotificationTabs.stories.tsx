import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { NotificationTabs } from "./NotificationTabs";

const meta = {
  title: "Notifications/NotificationTabs",
  component: NotificationTabs,
  parameters: { frame: "edge" },
  args: {
    activeTab: "all",
    onTabChange: fn(),
    pendingRequestCount: 3,
  },
} satisfies Meta<typeof NotificationTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
