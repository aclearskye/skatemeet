import { supabase } from "@/lib/supabaseClient";
import { PhotoReportReason } from "@/lib/shared/types";

export async function castStorePhotoVote(photoId: string, voteValue: 1 | -1): Promise<void> {
  const { error } = await supabase.rpc("cast_store_photo_vote", {
    p_photo_id: photoId,
    p_vote_value: voteValue,
  });
  if (error) throw error;
}

export async function reportStorePhoto(photoId: string, reason: PhotoReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_store_photo", {
    p_photo_id: photoId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function deleteStorePhoto(photoId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_store_photo", { p_photo_id: photoId });
  if (error) throw error;
}
