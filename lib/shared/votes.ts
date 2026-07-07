import { supabase } from "@/lib/supabaseClient";

export async function toggleVoteRow(
  table: string,
  filter: Record<string, string>,
  userId: string
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from(table)
    .insert({ ...filter, profile_id: userId });

  if (!insertError) return true;

  if (insertError.code === "23505") {
    let query = supabase.from(table).delete().eq("profile_id", userId);
    for (const [col, val] of Object.entries(filter)) {
      query = query.eq(col, val);
    }
    const { error: deleteError } = await query;
    if (deleteError) throw deleteError;
    return false;
  }

  throw insertError;
}

export async function getVoteStatus(
  table: string,
  filter: Record<string, string>,
  userId: string
): Promise<boolean> {
  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);
  for (const [col, val] of Object.entries(filter)) {
    query = query.eq(col, val);
  }
  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getVoteCount(
  table: string,
  col: string,
  val: string
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select("upvote_count")
    .eq(col, val)
    .single();
  if (error) throw error;
  return (data as { upvote_count: number }).upvote_count;
}
