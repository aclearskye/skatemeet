import type { Meta, StoryObj } from "@storybook/react-native";

import { DARK_MAP_STYLE } from "@/lib/theme";
import { SAMPLE_REGION, storyStyles } from "@/.rnstorybook/storyStyles";

import { MapView } from "./MapView";

// Resolves to MapView.web.tsx on web and react-native-maps on native.
const meta = {
  title: "Map/MapView",
  component: MapView,
  parameters: { frame: "screen" },
  args: {
    style: storyStyles.root,
    initialRegion: SAMPLE_REGION,
    // Same dark styling as the map screen (app/(tabs)/map.tsx).
    customMapStyle: DARK_MAP_STYLE,
    userInterfaceStyle: "dark",
  },
} satisfies Meta<typeof MapView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
