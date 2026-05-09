#!/usr/bin/env node
// Seed OSM skate stores into Supabase (osm_spots table, spot_type = 'shop').
//
// Local area:  node scripts/seed-osm-stores.mjs --lat=45.5231 --lng=-122.6697 [--radius=10000]
// Global seed: node scripts/seed-osm-stores.mjs --global  (queries ~130 cities, ~7-10 min)
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase Dashboard → Settings → API)

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard → Settings → API)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Args ──────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const isGlobal = args.global === true;
const lat = isGlobal ? null : parseFloat(args.lat);
const lng = isGlobal ? null : parseFloat(args.lng);
const radius = parseInt(args.radius ?? "10000");

if (!isGlobal && (isNaN(lat) || isNaN(lng))) {
  console.error("Usage:");
  console.error("  node scripts/seed-osm-stores.mjs --global");
  console.error("  node scripts/seed-osm-stores.mjs --lat=<lat> --lng=<lng> [--radius=<metres>]");
  process.exit(1);
}

// ── Cities for global seed ────────────────────────────────────────────────────

const GLOBAL_RADIUS = 40000; // 40 km per city

const CITIES = [
  // North America
  { name: "Los Angeles",       lat: 34.05,  lng: -118.24 },
  { name: "San Francisco",     lat: 37.77,  lng: -122.42 },
  { name: "Portland",          lat: 45.52,  lng: -122.68 },
  { name: "Seattle",           lat: 47.61,  lng: -122.33 },
  { name: "New York",          lat: 40.71,  lng:  -74.01 },
  { name: "Chicago",           lat: 41.85,  lng:  -87.65 },
  { name: "Denver",            lat: 39.74,  lng: -104.98 },
  { name: "Phoenix",           lat: 33.45,  lng: -112.07 },
  { name: "Las Vegas",         lat: 36.17,  lng: -115.14 },
  { name: "Salt Lake City",    lat: 40.76,  lng: -111.89 },
  { name: "Austin",            lat: 30.27,  lng:  -97.74 },
  { name: "Houston",           lat: 29.76,  lng:  -95.37 },
  { name: "Dallas",            lat: 32.78,  lng:  -96.80 },
  { name: "Miami",             lat: 25.77,  lng:  -80.19 },
  { name: "Atlanta",           lat: 33.75,  lng:  -84.39 },
  { name: "Boston",            lat: 42.36,  lng:  -71.06 },
  { name: "Philadelphia",      lat: 39.95,  lng:  -75.17 },
  { name: "Minneapolis",       lat: 44.98,  lng:  -93.27 },
  { name: "Detroit",           lat: 42.33,  lng:  -83.05 },
  { name: "Pittsburgh",        lat: 40.44,  lng:  -79.99 },
  { name: "New Orleans",       lat: 29.95,  lng:  -90.07 },
  { name: "San Diego",         lat: 32.72,  lng: -117.16 },
  { name: "Sacramento",        lat: 38.58,  lng: -121.49 },
  { name: "Toronto",           lat: 43.65,  lng:  -79.38 },
  { name: "Montreal",          lat: 45.50,  lng:  -73.57 },
  { name: "Vancouver",         lat: 49.25,  lng: -123.12 },
  { name: "Calgary",           lat: 51.05,  lng: -114.07 },
  { name: "Edmonton",          lat: 53.55,  lng: -113.49 },
  { name: "Winnipeg",          lat: 49.90,  lng:  -97.14 },
  { name: "Mexico City",       lat: 19.43,  lng:  -99.13 },
  { name: "Guadalajara",       lat: 20.67,  lng: -103.35 },
  { name: "Monterrey",         lat: 25.68,  lng: -100.32 },
  // South America
  { name: "São Paulo",         lat: -23.55, lng:  -46.63 },
  { name: "Rio de Janeiro",    lat: -22.91, lng:  -43.17 },
  { name: "Buenos Aires",      lat: -34.61, lng:  -58.38 },
  { name: "Santiago",          lat: -33.45, lng:  -70.67 },
  { name: "Bogotá",            lat:   4.71, lng:  -74.07 },
  { name: "Lima",              lat: -12.05, lng:  -77.04 },
  { name: "Medellín",          lat:   6.25, lng:  -75.56 },
  { name: "Montevideo",        lat: -34.90, lng:  -56.19 },
  { name: "Curitiba",          lat: -25.43, lng:  -49.27 },
  // Europe
  { name: "London",            lat: 51.51,  lng:   -0.13 },
  { name: "Manchester",        lat: 53.48,  lng:   -2.24 },
  { name: "Birmingham",        lat: 52.48,  lng:   -1.90 },
  { name: "Bristol",           lat: 51.45,  lng:   -2.59 },
  { name: "Edinburgh",         lat: 55.95,  lng:   -3.19 },
  { name: "Dublin",            lat: 53.33,  lng:   -6.25 },
  { name: "Paris",             lat: 48.85,  lng:    2.35 },
  { name: "Lyon",              lat: 45.74,  lng:    4.83 },
  { name: "Marseille",         lat: 43.30,  lng:    5.37 },
  { name: "Bordeaux",          lat: 44.84,  lng:   -0.58 },
  { name: "Berlin",            lat: 52.52,  lng:   13.40 },
  { name: "Hamburg",           lat: 53.55,  lng:   10.00 },
  { name: "Munich",            lat: 48.14,  lng:   11.58 },
  { name: "Cologne",           lat: 50.94,  lng:    6.96 },
  { name: "Frankfurt",         lat: 50.11,  lng:    8.68 },
  { name: "Barcelona",         lat: 41.39,  lng:    2.15 },
  { name: "Madrid",            lat: 40.42,  lng:   -3.70 },
  { name: "Seville",           lat: 37.39,  lng:   -5.99 },
  { name: "Lisbon",            lat: 38.72,  lng:   -9.14 },
  { name: "Amsterdam",         lat: 52.37,  lng:    4.90 },
  { name: "Rotterdam",         lat: 51.92,  lng:    4.48 },
  { name: "Brussels",          lat: 50.85,  lng:    4.35 },
  { name: "Copenhagen",        lat: 55.68,  lng:   12.57 },
  { name: "Stockholm",         lat: 59.33,  lng:   18.07 },
  { name: "Oslo",              lat: 59.91,  lng:   10.75 },
  { name: "Helsinki",          lat: 60.17,  lng:   24.94 },
  { name: "Vienna",            lat: 48.21,  lng:   16.37 },
  { name: "Zurich",            lat: 47.38,  lng:    8.54 },
  { name: "Geneva",            lat: 46.20,  lng:    6.14 },
  { name: "Prague",            lat: 50.09,  lng:   14.42 },
  { name: "Warsaw",            lat: 52.23,  lng:   21.01 },
  { name: "Budapest",          lat: 47.50,  lng:   19.04 },
  { name: "Bucharest",         lat: 44.43,  lng:   26.10 },
  { name: "Athens",            lat: 37.98,  lng:   23.73 },
  { name: "Rome",              lat: 41.90,  lng:   12.50 },
  { name: "Milan",             lat: 45.46,  lng:    9.19 },
  { name: "Turin",             lat: 45.07,  lng:    7.69 },
  { name: "Kyiv",              lat: 50.45,  lng:   30.52 },
  { name: "Belgrade",          lat: 44.80,  lng:   20.46 },
  { name: "Sofia",             lat: 42.70,  lng:   23.32 },
  // Russia
  { name: "Moscow",            lat: 55.76,  lng:   37.62 },
  { name: "Saint Petersburg",  lat: 59.95,  lng:   30.32 },
  { name: "Novosibirsk",       lat: 54.99,  lng:   82.90 },
  { name: "Yekaterinburg",     lat: 56.84,  lng:   60.61 },
  // Middle East
  { name: "Dubai",             lat: 25.20,  lng:   55.27 },
  { name: "Tel Aviv",          lat: 32.08,  lng:   34.78 },
  { name: "Istanbul",          lat: 41.01,  lng:   28.97 },
  { name: "Ankara",            lat: 39.93,  lng:   32.85 },
  { name: "Cairo",             lat: 30.06,  lng:   31.25 },
  { name: "Casablanca",        lat: 33.59,  lng:   -7.62 },
  // Asia
  { name: "Tokyo",             lat: 35.69,  lng:  139.69 },
  { name: "Osaka",             lat: 34.69,  lng:  135.50 },
  { name: "Nagoya",            lat: 35.18,  lng:  136.91 },
  { name: "Seoul",             lat: 37.57,  lng:  126.98 },
  { name: "Beijing",           lat: 39.91,  lng:  116.39 },
  { name: "Shanghai",          lat: 31.23,  lng:  121.47 },
  { name: "Shenzhen",          lat: 22.55,  lng:  114.07 },
  { name: "Guangzhou",         lat: 23.13,  lng:  113.26 },
  { name: "Hong Kong",         lat: 22.32,  lng:  114.17 },
  { name: "Taipei",            lat: 25.05,  lng:  121.56 },
  { name: "Singapore",         lat:  1.35,  lng:  103.82 },
  { name: "Bangkok",           lat: 13.75,  lng:  100.52 },
  { name: "Kuala Lumpur",      lat:  3.15,  lng:  101.70 },
  { name: "Jakarta",           lat: -6.21,  lng:  106.85 },
  { name: "Manila",            lat: 14.60,  lng:  121.00 },
  { name: "Ho Chi Minh City",  lat: 10.78,  lng:  106.70 },
  { name: "Hanoi",             lat: 21.03,  lng:  105.85 },
  { name: "Mumbai",            lat: 19.08,  lng:   72.88 },
  { name: "Delhi",             lat: 28.66,  lng:   77.23 },
  { name: "Bangalore",         lat: 12.97,  lng:   77.59 },
  { name: "Chennai",           lat: 13.09,  lng:   80.27 },
  { name: "Kolkata",           lat: 22.57,  lng:   88.37 },
  { name: "Karachi",           lat: 24.86,  lng:   67.01 },
  { name: "Lahore",            lat: 31.52,  lng:   74.36 },
  { name: "Dhaka",             lat: 23.72,  lng:   90.41 },
  { name: "Kathmandu",         lat: 27.71,  lng:   85.32 },
  { name: "Almaty",            lat: 43.25,  lng:   76.95 },
  { name: "Tashkent",          lat: 41.30,  lng:   69.25 },
  // Africa
  { name: "Cape Town",         lat: -33.93, lng:   18.42 },
  { name: "Johannesburg",      lat: -26.20, lng:   28.04 },
  { name: "Durban",            lat: -29.86, lng:   31.02 },
  { name: "Lagos",             lat:   6.45, lng:    3.38 },
  { name: "Nairobi",           lat:  -1.29, lng:   36.82 },
  { name: "Accra",             lat:   5.56, lng:   -0.20 },
  { name: "Tunis",             lat: 36.82,  lng:   10.16 },
  { name: "Dakar",             lat: 14.69,  lng:  -17.44 },
  // Oceania
  { name: "Sydney",            lat: -33.87, lng:  151.21 },
  { name: "Melbourne",         lat: -37.81, lng:  144.96 },
  { name: "Brisbane",          lat: -27.47, lng:  153.03 },
  { name: "Perth",             lat: -31.95, lng:  115.86 },
  { name: "Adelaide",          lat: -34.93, lng:  138.60 },
  { name: "Auckland",          lat: -36.87, lng:  174.77 },
  { name: "Wellington",        lat: -41.29, lng:  174.78 },
];

// ── Overpass ──────────────────────────────────────────────────────────────────

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Broad query: catches shop=skateboard, shop=sports tagged with sport=skateboard,
// and name-matched shops (e.g. "Tactics", "Zumiez") via name~skateboard heuristic.
function buildStoreQuery(lat, lng, radius) {
  const around = `(around:${radius},${lat},${lng})`;
  return `
[out:json][timeout:60];
(
  node["shop"="skateboard"]${around};
  way["shop"="skateboard"]${around};
  node["shop"="sports"]["sport"="skateboard"]${around};
  way["shop"="sports"]["sport"="skateboard"]${around};
);
out center;
  `.trim();
}

const DELAY_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchFromOverpass(query, attempt = 1) {
  const body = `data=${encodeURIComponent(query)}`;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      process.stdout.write(`  POST ${mirror}... `);
      const res = await fetch(mirror, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "SkateMeet/1.0 (seed-stores-script)",
        },
        body,
      });
      if (!res.ok) { console.log(`HTTP ${res.status} — trying next mirror`); continue; }
      const data = await res.json();
      if (data.remark && /runtime error|timeout|out of memory/i.test(data.remark)) {
        console.log(`Overpass error: ${data.remark.trim()} — trying next mirror`);
        continue;
      }
      console.log(`OK (${(data.elements ?? []).length} elements)`);
      return data;
    } catch (e) {
      console.log(`${e.message} — trying next mirror`);
    }
  }
  if (attempt < 2) {
    console.log(`  All mirrors failed, waiting 10s then retrying...`);
    await sleep(10000);
    return fetchFromOverpass(query, attempt + 1);
  }
  throw new Error("All Overpass mirrors failed after retry");
}

// ── OSM helpers ───────────────────────────────────────────────────────────────

function formatAddress(tags) {
  const parts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : tags["addr:full"] ?? "";
}

function elementsToStores(elements) {
  const stores = [];
  for (const el of elements) {
    if (!el.tags?.name) continue; // skip unnamed shops
    const eLat = el.type === "way" ? el.center?.lat : el.lat;
    const eLng = el.type === "way" ? el.center?.lon : el.lon;
    if (eLat == null || eLng == null) continue;

    stores.push({
      place_id: `osm-spot-${el.type}-${el.id}`,
      name: el.tags.name,
      address: formatAddress(el.tags),
      spot_type: "shop",
      latitude: eLat,
      longitude: eLng,
      seeded_at: new Date().toISOString(),
    });
  }
  return stores.filter((s, i, arr) => arr.findIndex((x) => x.place_id === s.place_id) === i);
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertStores(stores) {
  if (stores.length === 0) return;
  const CHUNK = 500;
  for (let i = 0; i < stores.length; i += CHUNK) {
    const chunk = stores.slice(i, i + CHUNK);
    const { error } = await supabase.from("osm_spots").upsert(chunk, { onConflict: "place_id" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
    process.stdout.write(`  Saved ${Math.min(i + CHUNK, stores.length)}/${stores.length}\r`);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (isGlobal) {
    console.log(`\nGlobal store seed — querying ${CITIES.length} cities (r=${GLOBAL_RADIUS / 1000}km)\n`);
    let totalSaved = 0;

    for (let i = 0; i < CITIES.length; i++) {
      const { name, lat: cLat, lng: cLng } = CITIES[i];
      console.log(`\n[${i + 1}/${CITIES.length}] ${name}`);
      try {
        const query = buildStoreQuery(cLat, cLng, GLOBAL_RADIUS);
        const osm = await fetchFromOverpass(query);
        const stores = elementsToStores(osm.elements ?? []);
        console.log(`  Found ${stores.length} stores`);
        await upsertStores(stores);
        totalSaved += stores.length;
      } catch (err) {
        console.error(`  Skipping ${name}: ${err.message}`);
      }
      if (i < CITIES.length - 1) await sleep(DELAY_MS);
    }

    console.log(`\nDone! ${totalSaved} stores seeded globally.\n`);
  } else {
    console.log(`\nSeeding stores around ${lat}, ${lng} (radius: ${radius}m)\n`);
    const query = buildStoreQuery(lat, lng, radius);
    const osm = await fetchFromOverpass(query);
    const stores = elementsToStores(osm.elements ?? []);
    console.log(`  Found ${stores.length} stores`);
    await upsertStores(stores);
    console.log(`Done! ${stores.length} stores seeded.\n`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
