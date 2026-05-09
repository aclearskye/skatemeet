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
  if (tags["shop"] === "skateboard") return "shop";
  if (tags["sport"] === "skateboard") return "park";
  return "street";
}

function formatAddress(tags) {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : tags["addr:full"] ?? "";
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
  for (const el of elements) {
    const eLat = el.type === "way" ? el.center?.lat : el.lat;
    const eLng = el.type === "way" ? el.center?.lon : el.lon;
    if (eLat == null || eLng == null) continue;

    const tags = el.tags ?? {};
    const spotType = deriveSpotType(tags);
    const suffix = spotType === "diy" ? "DIY Spot" : spotType === "park" ? "Skate Park" : "Skate Spot";
    const name = tags.name ?? (tags["addr:street"] ? `${tags["addr:street"]} ${suffix}` : suffix);

    spots.push({
      place_id: `osm-spot-${el.type}-${el.id}`,
      name,
      address: formatAddress(tags),
      spot_type: spotType,
      latitude: eLat,
      longitude: eLng,
      seeded_at: new Date().toISOString(),
    });
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

  console.log(`\nDone! ${unique.length} spots in database.\n`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
