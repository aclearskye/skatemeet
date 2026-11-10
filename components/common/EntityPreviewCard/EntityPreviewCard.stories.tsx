import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DIY, SAMPLE_OSM_SPOT, SAMPLE_OSM_STORE, SAMPLE_SPOT, SAMPLE_USER_STORE } from "@/.rnstorybook/fixtures";

import { EntityPreviewCard } from "./EntityPreviewCard";

const meta = {
  title: "Common/EntityPreviewCard",
  component: EntityPreviewCard,
  args: {
    item: { kind: "user-spot", data: SAMPLE_SPOT },
    onPress: fn(),
    initialHasVoted: false,
    distanceMiles: 1.4,
  },
} satisfies Meta<typeof EntityPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Spot: Story = {};

export const Diy: Story = {
  args: {
    item: { kind: "user-spot", data: SAMPLE_DIY },
  },
};

export const OsmSpot: Story = {
  args: {
    item: { kind: "osm-spot", data: SAMPLE_OSM_SPOT },
  },
};

export const UserStore: Story = {
  args: {
    item: { kind: "user-store", data: SAMPLE_USER_STORE },
  },
};

export const OsmStore: Story = {
  args: {
    item: { kind: "osm-store", data: SAMPLE_OSM_STORE },
  },
};
