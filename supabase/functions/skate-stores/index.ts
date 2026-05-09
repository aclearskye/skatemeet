import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Queries OSM for skateboard shops and skate parks within radius (metres)
function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:15];
(
  node["shop"="skateboard"](around:${radius},${lat},${lng});
  way["shop"="skateboard"](around:${radius},${lat},${lng});
  node["leisure"="skate_park"](around:${radius},${lat},${lng});
  way["leisure"="skate_park"](around:${radius},${lat},${lng});
  node["sport"="skateboarding"](around:${radius},${lat},${lng});
  way["sport"="skateboarding"](around:${radius},${lat},${lng});
);
out center;
  `.trim();
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : tags["addr:full"] ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { lat, lng, radius = 5000 } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat and lng are required numbers" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const query = buildOverpassQuery(lat, lng, radius);
    const overpassRes = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!overpassRes.ok) {
      throw new Error(`Overpass API returned ${overpassRes.status}`);
    }

    const osm = await overpassRes.json();

    const results = (osm.elements ?? [])
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        // Ways have a `center` object; nodes have direct lat/lon
        const coordLat = el.type === "way" ? el.center?.lat : el.lat;
        const coordLng = el.type === "way" ? el.center?.lon : el.lon;
        return {
          place_id: `osm-${el.type}-${el.id}`,
          name: el.tags.name,
          address: formatAddress(el.tags),
          rating: null,
          coordinates: { lat: coordLat, lng: coordLng },
        };
      })
      // Deduplicate by name+coords in case node and way overlap
      .filter(
        (store: any, index: number, arr: any[]) =>
          arr.findIndex((s) => s.place_id === store.place_id) === index
      );

    return new Response(JSON.stringify(results), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
