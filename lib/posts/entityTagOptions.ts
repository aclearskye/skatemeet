import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { coordinatesOf, haversineDistanceKm, type Coordinates } from "@/lib/map/types";
import type { PostEntityTag } from "./types";

// A pickable spot / DIY / store for the composer's entity tag.
export type EntityTagOption = {
  key: string;
  tag: PostEntityTag;
  name: string;
  kindLabel: "SPOT" | "DIY" | "STORE";
  distanceKm: number | null;
};

export function previewItemToTagOption(item: PreviewItem, from: Coordinates | null): EntityTagOption {
  const distanceKm = from ? haversineDistanceKm(from, coordinatesOf(item.data)) : null;
  switch (item.kind) {
    case "user-spot":
      return {
        key: `spot:${item.data.spot_id}`,
        tag: { kind: "spot", spotId: item.data.spot_id },
        name: item.data.name,
        kindLabel: item.data.type === "diy" ? "DIY" : "SPOT",
        distanceKm,
      };
    case "osm-spot":
      return {
        key: `osm_spot:${item.data.place_id}`,
        tag: { kind: "osm_spot", osmPlaceId: item.data.place_id },
        name: item.data.name,
        kindLabel: item.data.spot_type === "diy" ? "DIY" : "SPOT",
        distanceKm,
      };
    case "user-store":
      return {
        key: `store:${item.data.store_id}`,
        tag: { kind: "store", storeId: item.data.store_id },
        name: item.data.name,
        kindLabel: "STORE",
        distanceKm,
      };
    case "osm-store":
      return {
        key: `osm_store:${item.data.place_id}`,
        tag: { kind: "osm_store", osmPlaceId: item.data.place_id },
        name: item.data.name,
        kindLabel: "STORE",
        distanceKm,
      };
  }
}

// The `focus` param lib/map/useMapFocusParam.ts understands.
export function entityTagToMapFocus(tag: PostEntityTag): string {
  switch (tag.kind) {
    case "spot":
      return `spot:${tag.spotId}`;
    case "store":
      return `store:${tag.storeId}`;
    case "osm_spot":
    case "osm_store":
      return `${tag.kind}:${tag.osmPlaceId}`;
  }
}

export function entityTagFromFocus(focus: string): PostEntityTag | null {
  const [kind, ...rest] = focus.split(":");
  const id = rest.join(":");
  if (!id) return null;
  if (kind === "spot") return { kind, spotId: id };
  if (kind === "store") return { kind, storeId: id };
  if (kind === "osm_spot" || kind === "osm_store") return { kind, osmPlaceId: id };
  return null;
}

export function formatDistance(km: number | null): string | null {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)}M` : `${km.toFixed(1)}KM`;
}
