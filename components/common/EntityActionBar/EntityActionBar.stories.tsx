import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { EntityActionBar } from "./EntityActionBar";

const meta = {
  title: "Common/EntityActionBar",
  component: EntityActionBar,
  args: {
    entityRef: { spotId: SAMPLE_UUID, osmSpotPlaceId: null, storeId: null, osmStorePlaceId: null },
    accent: C.primary,
    onAccent: C.onPrimary,
    onDirections: fn(),
    vote: { count: 42, hasVoted: false, isLoading: false, onPress: fn() },
    votesToVerify: null,
  },
} satisfies Meta<typeof EntityActionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Voted: Story = {
  args: { vote: { count: 43, hasVoted: true, isLoading: false, onPress: fn() } },
};

export const Unverified: Story = {
  args: { vote: { count: 1, hasVoted: false, isLoading: false, onPress: fn() }, votesToVerify: 2 },
};

export const Store: Story = {
  args: {
    entityRef: { spotId: null, osmSpotPlaceId: null, storeId: SAMPLE_UUID, osmStorePlaceId: null },
    accent: C.secondary,
    onAccent: C.onSecondary,
  },
};
