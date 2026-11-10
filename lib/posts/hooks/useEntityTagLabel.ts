import { useQuery } from "@tanstack/react-query";
import { entityTagToMapFocus } from "@/lib/posts/entityTagOptions";
import type { PostEntityTag } from "@/lib/posts/types";
import { fetchOsmSpotsByIds, fetchUserSpotsByIds } from "@/lib/spots/queries";
import { fetchOsmStoresByIds, fetchUserStoresByIds } from "@/lib/stores/queries";
import { queryKeys } from "@/utils/queryKeys";

export type EntityTagLabel = { name: string; kindLabel: "SPOT" | "DIY" | "STORE" };

async function fetchLabel(tag: PostEntityTag): Promise<EntityTagLabel | null> {
  switch (tag.kind) {
    case "spot": {
      const [s] = await fetchUserSpotsByIds([tag.spotId]);
      return s ? { name: s.name, kindLabel: s.type === "diy" ? "DIY" : "SPOT" } : null;
    }
    case "osm_spot": {
      const [s] = await fetchOsmSpotsByIds([tag.osmPlaceId]);
      return s ? { name: s.name, kindLabel: s.spot_type === "diy" ? "DIY" : "SPOT" } : null;
    }
    case "store": {
      const [s] = await fetchUserStoresByIds([tag.storeId]);
      return s ? { name: s.name, kindLabel: "STORE" } : null;
    }
    case "osm_store": {
      const [s] = await fetchOsmStoresByIds([tag.osmPlaceId]);
      return s ? { name: s.name, kindLabel: "STORE" } : null;
    }
  }
}

// Name for a post's entity chip. Cached long -- spot names rarely change.
export function useEntityTagLabel(tag: PostEntityTag | null) {
  return useQuery({
    queryKey: queryKeys.entityTagLabel(tag ? entityTagToMapFocus(tag) : ""),
    queryFn: () => fetchLabel(tag!),
    enabled: tag != null,
    staleTime: 30 * 60 * 1000,
  });
}
