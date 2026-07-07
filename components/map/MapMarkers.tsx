import { PreviewItem } from "@/components/map/MapPreviewCard";
import { SpotMarker } from "@/components/map/SpotMarker";
import { StoreMarker } from "@/components/map/StoreMarker";
import { OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/skateSpots";
import { UserStore } from "@/lib/stores/skateStores";
import { C } from "@/lib/theme";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

type Props = {
  visibleOsmStores: OsmStore[];
  visibleUserStores: UserStore[];
  visibleOsmSpots: OsmSpot[];
  visibleUserSpots: SkateSpot[];
  pendingPin: { latitude: number; longitude: number } | null;
  previewItem: PreviewItem | null;
  onMarkerPress: (item: PreviewItem) => void;
};

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
      {visibleOsmStores.map((store) => (
        <Marker
          key={store.place_id}
          coordinate={{ latitude: store.coordinates.lat, longitude: store.coordinates.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onMarkerPress({ kind: "osm-store", data: store })}
        >
          <StoreMarker
            selected={previewItem?.kind === "osm-store" && previewItem.data.place_id === store.place_id}
          />
        </Marker>
      ))}

      {visibleUserStores.map((store) => (
        <Marker
          key={store.store_id}
          coordinate={{ latitude: store.latitude, longitude: store.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onMarkerPress({ kind: "user-store", data: store })}
        >
          <StoreMarker
            selected={previewItem?.kind === "user-store" && previewItem.data.store_id === store.store_id}
          />
        </Marker>
      ))}

      {visibleOsmSpots.map((spot) => (
        <Marker
          key={spot.place_id}
          coordinate={{ latitude: spot.coordinates.lat, longitude: spot.coordinates.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onMarkerPress({ kind: "osm-spot", data: spot })}
        >
          <SpotMarker
            isDiy={spot.spot_type === "diy"}
            selected={previewItem?.kind === "osm-spot" && previewItem.data.place_id === spot.place_id}
          />
        </Marker>
      ))}

      {visibleUserSpots.map((spot) => (
        <Marker
          key={spot.spot_id}
          coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onMarkerPress({ kind: "user-spot", data: spot })}
        >
          <SpotMarker
            isDiy={spot.type === "diy"}
            selected={previewItem?.kind === "user-spot" && previewItem.data.spot_id === spot.spot_id}
          />
        </Marker>
      ))}

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
