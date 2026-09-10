#!/usr/bin/env node
// Import an Overpass JSON export into Supabase osm_spots.
// Usage: node scripts/import-osm-json.mjs <path-to-export.json>
//
// Get the export from overpass-turbo.eu → Export → Data → download

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API)");
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-osm-json.mjs <path-to-export.json>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function deriveSpotType(tags) {
  if (tags["skate"] === "diy") return "diy";
  if (tags["leisure"] === "skatepark" || tags["sport"] === "skateboard") return "park";
  return "street";
}

function formatAddress(tags) {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : tags["addr:full"] ?? "";
}

// Nominatim usage policy caps public API use at ~1 request/second.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastNominatimCall = 0;
async function nearestRoad(lat, lng) {
  const wait = 1100 - (Date.now() - lastNominatimCall);
  if (wait > 0) await sleep(wait);
  lastNominatimCall = Date.now();
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&zoom=16`;
    const res = await fetch(url, { headers: { "User-Agent": "SkateMeet/1.0 (import-script)" } });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address ?? {};
    return addr.road ?? addr.pedestrian ?? addr.path ?? addr.footway ?? null;
  } catch {
    return null;
  }
}

function extractImageUrl(tags) {
  if (tags["image"]) return tags["image"];
  const commons = tags["wikimedia_commons"];
  if (commons?.startsWith("File:")) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.slice(5))}`;
  }
  return null;
}

const FACILITY_TAGS = [
  ["drinking_water", "water_fountain"],
  ["bench", "seating"],
  ["toilets", "restrooms"],
];

function extractFacilities(tags) {
  return FACILITY_TAGS.filter(([tag]) => tags[tag] === "yes").map(([, facility]) => facility);
}

function yesNo(value) {
  return value === "yes" ? true : value === "no" ? false : null;
}

async function seedSpotMetadata(rows) {
  if (rows.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("spot_metadata")
      .upsert(chunk, { onConflict: "osm_place_id", ignoreDuplicates: true });
    if (error) throw new Error(`Metadata seed failed: ${error.message}`);
  }
}

async function main() {
  console.log(`\nReading ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, "utf8"));

  // Support both raw Overpass JSON ({ elements: [...] }) and
  // Overpass Turbo export ({ type: "FeatureCollection", ... } wrapped in elements)
  const elements = raw.elements ?? [];

  if (elements.length === 0) {
    console.error("No elements found. Make sure you exported via Export → Data → download in Overpass Turbo.");
    process.exit(1);
  }

  console.log(`Parsing ${elements.length} OSM elements...`);

  const spots = [];
  const metadata = [];
  for (const el of elements) {
    const eLat = el.type === "way" ? el.center?.lat : el.lat;
    const eLng = el.type === "way" ? el.center?.lon : el.lon;
    if (eLat == null || eLng == null) continue;

    const tags = el.tags ?? {};
    const spotType = deriveSpotType(tags);
    const suffix = spotType === "diy" ? "DIY Spot" : spotType === "park" ? "Skate Park" : "Skate Spot";

    let name = tags.name ?? tags.operator ?? tags.brand;
    if (!name && tags["addr:street"]) name = `${tags["addr:street"]} ${suffix}`;
    if (!name) {
      const road = await nearestRoad(eLat, eLng);
      name = road ? `${road} ${suffix}` : suffix;
    }

    const placeId = `osm-spot-${el.type}-${el.id}`;
    spots.push({
      place_id: placeId,
      name,
      address: formatAddress(tags),
      spot_type: spotType,
      latitude: eLat,
      longitude: eLng,
      description: tags.description ?? null,
      osm_image_url: extractImageUrl(tags),
      seeded_at: new Date().toISOString(),
    });

    const facilities = extractFacilities(tags);
    const wellLit = yesNo(tags.lit);
    const paid = yesNo(tags.fee);
    if (facilities.length > 0 || wellLit !== null || paid !== null) {
      metadata.push({ osm_place_id: placeId, facilities, well_lit: wellLit, paid });
    }
  }

  const unique = spots.filter((s, i, arr) => arr.findIndex((x) => x.place_id === s.place_id) === i);
  console.log(`Upserting ${unique.length} spots (${elements.length - unique.length} duplicates skipped)...\n`);

  const CHUNK = 500;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { error } = await supabase.from("osm_spots").upsert(chunk, { onConflict: "place_id" });
    if (error) {
      console.error(`Upsert failed at chunk ${i}: ${error.message}`);
      process.exit(1);
    }
    process.stdout.write(`  ${Math.min(i + CHUNK, unique.length)}/${unique.length} saved\r`);
  }

  await seedSpotMetadata(metadata);

  console.log(`\nDone! ${unique.length} spots in database.\n`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
