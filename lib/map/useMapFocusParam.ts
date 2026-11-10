import { useEffect, type RefObject } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type MapViewNative from "react-native-maps";
import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { coordinatesOf } from "@/lib/map/types";
import { fetchOsmSpotsByIds, fetchUserSpotsByIds } from "@/lib/spots/queries";
import { fetchOsmStoresByIds, fetchUserStoresByIds } from "@/lib/stores/queries";

// `/map?focus=<kind>:<id>` (kind = spot | osm_spot | store | osm_store, the
// PostEntityTag kinds) centres the map on that entity and opens its preview
// card -- the post viewer's "go to spot".
export function useMapFocusParam(
  mapRef: RefObject<MapViewNative | null>,
  mapReady: boolean,
  onSelect: (item: PreviewItem) => void
) {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!focus || !mapReady) return;
    const [kind, ...rest] = focus.split(":");
    const id = rest.join(":");
    let cancelled = false;

    async function resolve(): Promise<PreviewItem | null> {
      if (kind === "spot") {
        const [data] = await fetchUserSpotsByIds([id]);
        return data ? { kind: "user-spot", data } : null;
      }
      if (kind === "osm_spot") {
        const [data] = await fetchOsmSpotsByIds([id]);
        return data ? { kind: "osm-spot", data } : null;
      }
      if (kind === "store") {
        const [data] = await fetchUserStoresByIds([id]);
        return data ? { kind: "user-store", data } : null;
      }
      if (kind === "osm_store") {
        const [data] = await fetchOsmStoresByIds([id]);
        return data ? { kind: "osm-store", data } : null;
      }
      return null;
    }

    resolve()
      .then((item) => {
        if (cancelled || !item) return;
        const { lat, lng } = coordinatesOf(item.data);
        mapRef.current?.animateToRegion?.({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
        onSelect(item);
      })
      .catch(() => {})
      .finally(() => {
        // Consume the param so returning to the tab doesn't re-trigger it.
        if (!cancelled) router.setParams({ focus: undefined });
      });

    return () => {
      cancelled = true;
    };
  }, [focus, mapReady, mapRef, onSelect, router]);
}
