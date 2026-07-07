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
