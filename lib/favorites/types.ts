export type SpotFavoriteRow = {
  created_at: string;
  spot_id: string | null;
  osm_place_id: string | null;
};

export type StoreFavoriteRow = {
  created_at: string;
  store_id: string | null;
  osm_place_id: string | null;
};
