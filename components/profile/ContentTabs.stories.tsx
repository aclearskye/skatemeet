import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import ContentTabs from "./ContentTabs";

const meta = {
  title: "Profile/ContentTabs",
  component: ContentTabs,
  parameters: { frame: "edge" },
  args: {
    activeTab: 0,
    onTabChange: fn(),
    showSaved: true,
  },
  render: function Render(args) {
    const [tab, setTab] = useState(args.activeTab);
    return (
      <ContentTabs
        {...args}
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          args.onTabChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof ContentTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OwnProfile: Story = {};

export const OtherProfile: Story = {
  args: {
    showSaved: false,
  },
};
