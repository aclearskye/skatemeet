import { PreviewItem } from "@/components/map/MapPreviewCard";
import { SpotMarker } from "@/components/map/SpotMarker";
import { StoreMarker } from "@/components/map/StoreMarker";
import { useTracksViewChanges } from "@/lib/map/useTracksViewChanges";
import { OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/types";
import { UserStore } from "@/lib/stores/types";
import { C } from "@/lib/theme";
import { Fragment, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
// Relative, not "@/...": Expo's "@/" alias resolves straight to a file and skips
// Metro's platform-extension probing, so it would always pick MapView.ts over
// MapView.web.tsx. A relative import goes through normal platform resolution.
import { Marker } from "./MapView";

type Props = {
  visibleOsmStores: OsmStore[];
  visibleUserStores: UserStore[];
  visibleOsmSpots: OsmSpot[];
  visibleUserSpots: SkateSpot[];
  pendingPin: { latitude: number; longitude: number } | null;
  previewItem: PreviewItem | null;
  onMarkerPress: (item: PreviewItem) => void;
};

type EntityMarkerProps = {
  coordinate: { latitude: number; longitude: number };
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
};

// Each entity marker needs its own tracksViewChanges lifecycle (see
// useTracksViewChanges), which means its own hook instance — hence a real
// component here rather than building the <Marker> inline in the .map()s below.
function EntityMarker({ coordinate, selected, onPress, children }: EntityMarkerProps) {
  const tracksViewChanges = useTracksViewChanges(selected);
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
    >
      {children}
    </Marker>
  );
}

export function MapMarkers({
  visibleOsmStores,
  visibleUserStores,
  visibleOsmSpots,
  visibleUserSpots,
  pendingPin,
  previewItem,
  onMarkerPress,
}: Props) {
  return (
    <Fragment>
      {visibleOsmStores.map((store) => {
        const selected = previewItem?.kind === "osm-store" && previewItem.data.place_id === store.place_id;
        return (
          <EntityMarker
            key={store.place_id}
            coordinate={{ latitude: store.coordinates.lat, longitude: store.coordinates.lng }}
            selected={selected}
            onPress={() => onMarkerPress({ kind: "osm-store", data: store })}
          >
            <StoreMarker selected={selected} />
          </EntityMarker>
        );
      })}

      {visibleUserStores.map((store) => {
        const selected = previewItem?.kind === "user-store" && previewItem.data.store_id === store.store_id;
        return (
          <EntityMarker
            key={store.store_id}
            coordinate={{ latitude: store.latitude, longitude: store.longitude }}
            selected={selected}
            onPress={() => onMarkerPress({ kind: "user-store", data: store })}
          >
            <StoreMarker selected={selected} />
          </EntityMarker>
        );
      })}

      {visibleOsmSpots.map((spot) => {
        const selected = previewItem?.kind === "osm-spot" && previewItem.data.place_id === spot.place_id;
        return (
          <EntityMarker
            key={spot.place_id}
            coordinate={{ latitude: spot.coordinates.lat, longitude: spot.coordinates.lng }}
            selected={selected}
            onPress={() => onMarkerPress({ kind: "osm-spot", data: spot })}
          >
            <SpotMarker isDiy={spot.spot_type === "diy"} selected={selected} />
          </EntityMarker>
        );
      })}

      {visibleUserSpots.map((spot) => {
        const selected = previewItem?.kind === "user-spot" && previewItem.data.spot_id === spot.spot_id;
        return (
          <EntityMarker
            key={spot.spot_id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            selected={selected}
            onPress={() => onMarkerPress({ kind: "user-spot", data: spot })}
          >
            <SpotMarker isDiy={spot.type === "diy"} selected={selected} />
          </EntityMarker>
        );
      })}

      {pendingPin && (
        <Marker coordinate={pendingPin} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pendingPin}>
            <Text style={styles.pendingPinText}>?</Text>
          </View>
        </Marker>
      )}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  pendingPin: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: C.surfaceHigh,
  },
  pendingPinText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
});
