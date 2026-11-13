import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { NearbySkatersList } from "./NearbySkatersList";

const meta = {
  title: "Search/NearbySkatersList",
  component: NearbySkatersList,
  args: {
    status: "ready",
    areaName: null,
    results: [
      {
        profileId: "00000000-0000-0000-0000-000000000001",
        username: "kickflipkid",
        displayName: "Kickflip Kid",
        disciplines: ["street"],
        city: "Leeds",
        avatarUrl: null,
        isPrivate: false,
      },
      {
        profileId: "00000000-0000-0000-0000-000000000002",
        username: "bowlrider",
        displayName: null,
        disciplines: ["bowl", "park"],
        city: null,
        avatarUrl: null,
        isPrivate: false,
      },
    ],
    isFetchingNextPage: false,
    bottomInset: 0,
    onSelect: fn(),
    onEndReached: fn(),
    onChangeLocation: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof NearbySkatersList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const CustomCity: Story = {
  args: { areaName: "Barcelona" },
};

export const Empty: Story = {
  args: { status: "empty", results: [] },
};

export const NoLocation: Story = {
  args: { status: "noLocation", results: [] },
};

export const RateLimited: Story = {
  args: { status: "rateLimited", results: [] },
};
