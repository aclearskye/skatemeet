import { supabase } from "@/lib/supabaseClient";

export type SkateStore = {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  coordinates: { lat: number; lng: number };
};

type EdgeFunctionParams = {
  lat: number;
  lng: number;
  radius?: number;
};

export async function fetchNearbySkateStores(
  params: EdgeFunctionParams
): Promise<SkateStore[]> {
  const { data, error } = await supabase.functions.invoke("skate-stores", {
    body: {
      lat: params.lat,
      lng: params.lng,
      radius: params.radius ?? 5000,
    },
  });

  if (error) throw error;
  return data as SkateStore[];
}
