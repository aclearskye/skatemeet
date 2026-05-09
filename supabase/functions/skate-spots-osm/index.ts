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
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${radius},${lat},${lng})`;
  return `
[out:json][timeout:25];
(
  node["sport"="skateboard"]${around};
  way["sport"="skateboard"]${around};
  relation["sport"="skateboard"]${around};
  node["skate"="diy"]${around};
  way["skate"="diy"]${around};
  node["shop"="skateboard"]${around};
  way["shop"="skateboard"]${around};
);
out center;
  `.trim();
}

function deriveSpotType(tags: Record<string, string>): "park" | "diy" | "street" | "shop" {
  if (tags["skate"] === "diy") return "diy";
  if (tags["shop"] === "skateboard") return "shop";
  if (tags["sport"] === "skateboard") return "park";
  return "street";
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : tags["addr:full"] ?? "";
}

async function nearestRoad(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&zoom=16`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SkateMeet/1.0 (skatemeet-app)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address ?? {};
    return addr.road ?? addr.pedestrian ?? addr.path ?? addr.footway ?? null;
  } catch {
    return null;
  }
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

    // Filter to elements with usable coordinates
    const elements = (osm.elements ?? []).filter((el: any) => {
      const coordLat = el.type === "way" ? el.center?.lat : el.lat;
      const coordLng = el.type === "way" ? el.center?.lon : el.lon;
      return coordLat != null && coordLng != null;
    });

    // Resolve names — geocode unnamed elements in parallel
    const resolved = await Promise.all(
      elements.map(async (el: any) => {
        const coordLat = el.type === "way" ? el.center?.lat : el.lat;
        const coordLng = el.type === "way" ? el.center?.lon : el.lon;
        const spotType = deriveSpotType(el.tags);

        const suffix =
          spotType === "diy" ? "DIY Spot"
          : spotType === "shop" ? "Skate Shop"
          : spotType === "park" ? "Skate Park"
          : "Skate Spot";

        let name: string;
        if (el.tags.name) {
          name = el.tags.name;
        } else if (el.tags["addr:street"]) {
          name = `${el.tags["addr:street"]} ${suffix}`;
        } else {
          const road = await nearestRoad(coordLat, coordLng);
          name = road ? `${road} ${suffix}` : suffix;
        }

        return {
          place_id: `osm-spot-${el.type}-${el.id}`,
          name,
          address: formatAddress(el.tags),
          spot_type: spotType,
          coordinates: { lat: coordLat, lng: coordLng },
        };
      })
    );

    // Deduplicate
    const results = resolved.filter(
      (spot, index, arr) => arr.findIndex((s) => s.place_id === spot.place_id) === index
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
