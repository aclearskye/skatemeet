import { BoundingBox } from "@/lib/spots/types";
import { MAP_TILE_SIZE_DEG } from "@/utils/constants";

export type Tile = { x: number; y: number };

export function tileKey(tile: Tile): string {
  return `${tile.x}:${tile.y}`;
}

export function latLngToTile(lat: number, lng: number): Tile {
  return {
    x: Math.floor(lng / MAP_TILE_SIZE_DEG),
    y: Math.floor(lat / MAP_TILE_SIZE_DEG),
  };
}

export function tileToBbox(tile: Tile): BoundingBox {
  return {
    minLat: tile.y * MAP_TILE_SIZE_DEG,
    maxLat: (tile.y + 1) * MAP_TILE_SIZE_DEG,
    minLng: tile.x * MAP_TILE_SIZE_DEG,
    maxLng: (tile.x + 1) * MAP_TILE_SIZE_DEG,
  };
}

// Every tile whose grid cell overlaps bbox, so panning within an already-seen
// area re-reads cached tiles instead of issuing new requests.
export function tilesForBbox(bbox: BoundingBox): Tile[] {
  const minX = Math.floor(bbox.minLng / MAP_TILE_SIZE_DEG);
  const maxX = Math.floor(bbox.maxLng / MAP_TILE_SIZE_DEG);
  const minY = Math.floor(bbox.minLat / MAP_TILE_SIZE_DEG);
  const maxY = Math.floor(bbox.maxLat / MAP_TILE_SIZE_DEG);

  const tiles: Tile[] = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

// Entities near a tile boundary can be returned by more than one adjacent
// tile query; collapse those duplicates before rendering.
export function dedupeById<T>(items: T[], idOf: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of items) seen.set(idOf(item), item);
  return Array.from(seen.values());
}

export type Coordinates = { lat: number; lng: number };

type Located = { latitude: number; longitude: number } | { coordinates: Coordinates };

// OSM entities carry `coordinates: {lat, lng}`; user-created ones carry flat
// `latitude`/`longitude` columns straight from Supabase — this normalizes both.
export function coordinatesOf(entity: Located): Coordinates {
  return "coordinates" in entity ? entity.coordinates : { lat: entity.latitude, lng: entity.longitude };
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const MILES_PER_KM = 0.621371;

export function kmToMiles(km: number): number {
  return km * MILES_PER_KM;
}

const KM_PER_DEGREE_LAT = 111.32;

// Approximate square box of the given radius around a point — good enough for
// widening a search's candidate pool, not for precise distance math (that's
// haversineDistanceKm's job).
export function boundingBoxAround(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  const lngDelta = radiusKm / (kmPerDegreeLng || KM_PER_DEGREE_LAT);
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
