import type { PreviewItem } from "@/components/map/MapPreviewCard";

export type SpotPreviewItem = Extract<PreviewItem, { kind: "user-spot" | "osm-spot" }>;
export type StorePreviewItem = Extract<PreviewItem, { kind: "osm-store" | "user-store" }>;

export function isSpotItem(item: PreviewItem): item is SpotPreviewItem {
  return item.kind === "user-spot" || item.kind === "osm-spot";
}

export function isStoreItem(item: PreviewItem): item is StorePreviewItem {
  return item.kind === "osm-store" || item.kind === "user-store";
}

export function exhaustiveCheck(x: never): never {
  throw new Error(`Unhandled discriminated union case: ${JSON.stringify(x)}`);
}

export function previewItemId(item: PreviewItem): string {
  switch (item.kind) {
    case "user-spot":
      return `user-spot-${item.data.spot_id}`;
    case "osm-spot":
      return `osm-spot-${item.data.place_id}`;
    case "user-store":
      return `user-store-${item.data.store_id}`;
    case "osm-store":
      return `osm-store-${item.data.place_id}`;
    default:
      return exhaustiveCheck(item);
  }
}
