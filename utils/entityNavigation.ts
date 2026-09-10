import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { isSpotItem } from "@/utils/typeGuards";

export function entityDetailRoute(item: PreviewItem) {
  return {
    pathname: isSpotItem(item) ? "/spot-detail" : "/store-detail",
    params: { kind: item.kind, data: JSON.stringify(item.data) },
  };
}
