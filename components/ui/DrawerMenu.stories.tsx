import { useEffect } from "react";

import type { Meta, StoryObj } from "@storybook/react-native";

import { DrawerProvider, useDrawer } from "@/lib/context/drawer-context";

import DrawerMenu from "./DrawerMenu";

// Its own DrawerProvider, opened on mount, so the story doesn't toggle the
// app's global drawer.
function OpenDrawer() {
  const { openDrawer } = useDrawer();
  useEffect(() => {
    openDrawer();
  }, [openDrawer]);
  return <DrawerMenu />;
}

const meta = {
  title: "UI/DrawerMenu",
  component: DrawerMenu,
  parameters: { frame: "screen" },
  render: () => (
    <DrawerProvider>
      <OpenDrawer />
    </DrawerProvider>
  ),
} satisfies Meta<typeof DrawerMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};
