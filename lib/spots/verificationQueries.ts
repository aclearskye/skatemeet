import { supabase } from "@/lib/supabaseClient";

export type SpotVerificationStatus = {
  is_verified: boolean;
  has_pending_request: boolean;
  my_tokens: number;
  my_blocked_until: string | null;
};

export async function fetchSpotVerificationStatus(spotId: string): Promise<SpotVerificationStatus> {
  const { data, error } = await supabase
    .rpc("get_spot_verification_status", { p_spot_id: spotId })
    .single();
  if (error) throw error;
  return data as SpotVerificationStatus;
}
