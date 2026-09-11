import { OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/types";
import { UserStore } from "@/lib/stores/types";
import { FilterKey } from "@/utils/constants";

export type RawMapData = {
  osmSpots: OsmSpot[];
  osmStores: OsmStore[];
  userSpots: SkateSpot[];
  userStores: UserStore[];
};

export type FilteredMapData = {
  visibleOsmSpots: OsmSpot[];
  visibleOsmStores: OsmStore[];
  visibleUserSpots: SkateSpot[];
  visibleUserStores: UserStore[];
};

export function filterVisibleMarkers(
  data: RawMapData,
  filters: Set<FilterKey>,
  search: string
): FilteredMapData {
  const q = search.toLowerCase();
  const matches = (name: string, address?: string) =>
    search === "" ||
    name.toLowerCase().includes(q) ||
    (address !== undefined && address.toLowerCase().includes(q));

  // "userSpots" ("User Uploaded" in the UI) excludes every OSM-sourced
  // entity — spots and stores alike — on top of (not instead of) the
  // spots/diys/stores type filters above.
  const visibleOsmStores =
    filters.has("stores") && !filters.has("userSpots")
      ? data.osmStores.filter((s) => matches(s.name, s.address))
      : [];

  const visibleOsmSpots = filters.has("userSpots")
    ? []
    : data.osmSpots.filter((s) => {
        const typeMatch =
          (filters.has("spots") && (s.spot_type === "park" || s.spot_type === "street")) ||
          (filters.has("diys") && s.spot_type === "diy");
        return typeMatch && matches(s.name);
      });

  const visibleUserSpots = data.userSpots.filter((s) => {
    const typeMatch =
      (filters.has("spots") &&
        (s.type === "street" || s.type === "park" || s.type === "indoor")) ||
      (filters.has("diys") && s.type === "diy");
    return typeMatch && matches(s.name);
  });

  const visibleUserStores = filters.has("stores") ? data.userStores : [];

  return { visibleOsmSpots, visibleOsmStores, visibleUserSpots, visibleUserStores };
}
