// City search for the Search tab's location picker. Forwards to Photon (an
// OpenStreetMap geocoder with autocomplete) so the client never talks to a
// third party directly, and works on web where expo-location's geocoder
// doesn't. Only towns, cities, districts and regions are returned: nearby
// search needs an area, not a street address.
//
// verify_jwt alone isn't enough here: the app's public anon key is itself a
// valid token, so it would let anyone call this as a free geocoding proxy
// and risk Photon blocking us. So the caller must be a real signed-in user
// (auth.getUser), and claim_geocode_request caps each account at 30 searches
// a minute (20261114130000_geocode_rate_limit.sql).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHOTON_URL = "https://photon.komoot.io/api/";
const PLACE_LAYERS = ["city", "district", "locality", "county", "state"];
const MAX_RESULTS = 8;
const MAX_QUERY_LENGTH = 100;

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; state?: string; country?: string };
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function labelFor(properties: NonNullable<PhotonFeature["properties"]>): string | null {
  if (!properties.name) return null;
  const parts = [properties.name, properties.state, properties.country].filter(
    (part, index, all): part is string => !!part && all.indexOf(part) === index
  );
  return parts.join(", ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);

    const { data: allowed, error: limitError } = await callerClient.rpc("claim_geocode_request");
    if (limitError) throw new Error(limitError.message);
    if (allowed !== true) return json({ error: "RATE_LIMITED" }, 429);

    const { query } = await req.json();
    if (typeof query !== "string") return json({ error: "query is required" }, 400);
    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
    if (trimmed.length < 2) return json({ results: [] });

    const url = new URL(PHOTON_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("limit", String(MAX_RESULTS * 2));
    url.searchParams.set("lang", "en");
    for (const layer of PLACE_LAYERS) url.searchParams.append("layer", layer);

    const res = await fetch(url, { headers: { "User-Agent": "SkateMeet geocode-place" } });
    if (!res.ok) throw new Error(`Photon responded ${res.status}`);
    const body: { features?: PhotonFeature[] } = await res.json();

    const seen = new Set<string>();
    const results = [];
    for (const feature of body.features ?? []) {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      const label = feature.properties ? labelFor(feature.properties) : null;
      if (typeof lat !== "number" || typeof lng !== "number" || !label || seen.has(label)) continue;
      seen.add(label);
      results.push({ label, coords: { lat, lng } });
      if (results.length >= MAX_RESULTS) break;
    }

    return json({ results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Geocoding failed" }, 502);
  }
});
