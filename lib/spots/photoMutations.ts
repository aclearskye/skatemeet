import { supabase } from "@/lib/supabaseClient";
import { PhotoReportReason } from "@/lib/shared/types";

export async function castSpotPhotoVote(photoId: string, voteValue: 1 | -1): Promise<void> {
  const { error } = await supabase.rpc("cast_spot_photo_vote", {
    p_photo_id: photoId,
    p_vote_value: voteValue,
  });
  if (error) throw error;
}

export async function reportSpotPhoto(photoId: string, reason: PhotoReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_spot_photo", {
    p_photo_id: photoId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function deleteSpotPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_spot_photo", { p_photo_id: photoId });
  if (error) throw error;
}
