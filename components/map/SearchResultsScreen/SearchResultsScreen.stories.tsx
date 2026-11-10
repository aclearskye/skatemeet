import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { SAMPLE_DIY, SAMPLE_OSM_SPOT, SAMPLE_OSM_STORE, SAMPLE_SPOT, SAMPLE_USER_STORE } from "@/.rnstorybook/fixtures";

import { SearchResultsScreen } from "./SearchResultsScreen";

const meta = {
  title: "Map/SearchResultsScreen",
  component: SearchResultsScreen,
  parameters: { frame: "screen" },
  args: {
    query: "south",
    results: [
      { kind: "user-spot", data: SAMPLE_SPOT },
      { kind: "user-spot", data: SAMPLE_DIY },
      { kind: "osm-spot", data: SAMPLE_OSM_SPOT },
      { kind: "user-store", data: SAMPLE_USER_STORE },
      { kind: "osm-store", data: SAMPLE_OSM_STORE },
    ],
    isSearching: false,
    isLoadingMore: false,
    hasMore: false,
    onLoadMore: fn(),
    sortMode: "distance",
    onSortModeChange: fn(),
    userLocation: { lat: 51.5, lng: -0.12 },
    userUploadedOnly: false,
    onToggleUserUploadedOnly: fn(),
  },
} satisfies Meta<typeof SearchResultsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Searching: Story = {
  args: {
    results: [],
    isSearching: true,
  },
};

export const NoResults: Story = {
  args: {
    results: [],
  },
};
