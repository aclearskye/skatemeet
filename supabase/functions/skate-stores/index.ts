import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:15];
(
  node["shop"="skateboard"](around:${radius},${lat},${lng});
  way["shop"="skateboard"](around:${radius},${lat},${lng});
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

    let osm: any = null;
    let lastErr = "";
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) { lastErr = `${mirror} → ${res.status}`; continue; }
        osm = await res.json();
        break;
      } catch (e: any) {
        lastErr = `${mirror} → ${e.message}`;
      }
    }
    if (!osm) throw new Error(`All Overpass mirrors failed. Last: ${lastErr}`);

    const results = (osm.elements ?? [])
      .filter((el: any) => el.tags?.name || el.tags?.brand || el.tags?.operator)
      .map((el: any) => {
        // Ways have a `center` object; nodes have direct lat/lon
        const coordLat = el.type === "way" ? el.center?.lat : el.lat;
        const coordLng = el.type === "way" ? el.center?.lon : el.lon;
        return {
          place_id: `osm-${el.type}-${el.id}`,
          name: el.tags.name ?? el.tags.brand ?? el.tags.operator,
          address: formatAddress(el.tags),
          rating: null,
          coordinates: { lat: coordLat, lng: coordLng },
          description: el.tags.description ?? null,
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
