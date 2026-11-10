import type { Meta, StoryObj } from "@storybook/react-native";

import { PrivateProfileLock } from "./PrivateProfileLock";

// Only shows while the signed-in profile is private (read live from Supabase),
// so it renders nothing for the mock Storybook user.
const meta = {
  title: "Profile/PrivateProfileLock",
  component: PrivateProfileLock,
  parameters: { frame: "inline" },
} satisfies Meta<typeof PrivateProfileLock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
