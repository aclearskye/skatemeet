import { CreateSpotSheet } from "@/components/spots/CreateSpotSheet";
import { CreateStoreSheet } from "@/components/stores/CreateStoreSheet";
import { SkateSpot } from "@/lib/spots/skateSpots";
import { UserStore } from "@/lib/stores/skateStores";
import { Fragment } from "react";

type Props = {
  pendingPin: { latitude: number; longitude: number } | null;
  pinCategory: "spot" | "diy" | "store" | null;
  showCreateSpotSheet: boolean;
  showCreateStoreSheet: boolean;
  onCancel: () => void;
  onSpotCreated: (spot: SkateSpot) => void;
  onStoreCreated: (store: UserStore) => void;
};

export function PinDropSheets({
  pendingPin,
  pinCategory,
  showCreateSpotSheet,
  showCreateStoreSheet,
  onCancel,
  onSpotCreated,
  onStoreCreated,
}: Props) {
  if (!pendingPin) return null;

  return (
    <Fragment>
      <CreateSpotSheet
        visible={showCreateSpotSheet}
        onClose={onCancel}
        onSpotCreated={onSpotCreated}
        initialCoordinates={pendingPin}
        lockedType={pinCategory === "diy" ? "diy" : undefined}
      />
      <CreateStoreSheet
        visible={showCreateStoreSheet}
        onClose={onCancel}
        onStoreCreated={onStoreCreated}
        initialCoordinates={pendingPin}
      />
    </Fragment>
  );
}
