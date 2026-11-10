import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { View } from "react-native";

import { DARK_MAP_STYLE } from "@/lib/theme";
import { SAMPLE_REGION, storyStyles } from "@/.rnstorybook/storyStyles";
import { MapView } from "@/components/map/MapView";
import { SAMPLE_DIY, SAMPLE_OSM_SPOT, SAMPLE_OSM_STORE, SAMPLE_SPOT, SAMPLE_USER_STORE } from "@/.rnstorybook/fixtures";

import { MapMarkers } from "./MapMarkers";

const meta = {
  title: "Map/MapMarkers",
  component: MapMarkers,
  parameters: { frame: "screen" },
  args: {
    visibleOsmStores: [SAMPLE_OSM_STORE],
    visibleUserStores: [SAMPLE_USER_STORE],
    visibleOsmSpots: [SAMPLE_OSM_SPOT],
    visibleUserSpots: [SAMPLE_SPOT, { ...SAMPLE_DIY, spot_id: "diy-1", latitude: 51.49, longitude: -0.11 }],
    liveCounts: new Map(),
    pendingPin: null,
    previewItem: null,
    onMarkerPress: fn(),
  },
  render: (args) => (
    <View style={storyStyles.root}>
      <MapView
        style={storyStyles.root}
        initialRegion={SAMPLE_REGION}
        // Same dark styling as the map screen (app/(tabs)/map.tsx).
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
      >
        <MapMarkers {...args} />
      </MapView>
    </View>
  ),
} satisfies Meta<typeof MapMarkers>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
