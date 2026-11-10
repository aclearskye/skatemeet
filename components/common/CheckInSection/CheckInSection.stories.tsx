import type { Meta, StoryObj } from "@storybook/react-native";

import { C } from "@/lib/theme";
import { SAMPLE_UUID } from "@/.rnstorybook/fixtures";

import { CheckInSection } from "./CheckInSection";

const meta = {
  title: "Common/CheckInSection",
  component: CheckInSection,
  args: {
    entityRef: { spotId: SAMPLE_UUID, osmSpotPlaceId: null, storeId: null, osmStorePlaceId: null },
    accent: C.primary,
    onAccent: C.onPrimary,
  },
} satisfies Meta<typeof CheckInSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
