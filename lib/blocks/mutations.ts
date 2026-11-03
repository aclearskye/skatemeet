import { supabase } from "@/lib/supabaseClient";
import type { BlockErrorCode } from "./types";

const MESSAGES: Record<BlockErrorCode, string> = {
  CANNOT_BLOCK_SELF: "You can't block yourself.",
  UNKNOWN: "Something went wrong — try again.",
};

export class BlockError extends Error {
  code: BlockErrorCode;
  constructor(code: BlockErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toBlockError(error: { message: string }): BlockError {
  const code = (Object.keys(MESSAGES) as BlockErrorCode[]).find((c) => error.message.includes(c));
  return new BlockError(code ?? "UNKNOWN");
}

export async function blockProfile(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("block_profile", { p_profile_id: profileId });
  if (error) throw toBlockError(error);
}

export async function unblockProfile(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("unblock_profile", { p_profile_id: profileId });
  if (error) throw toBlockError(error);
}
