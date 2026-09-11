import { supabase } from "@/lib/supabaseClient";

export type VerificationErrorCode =
  | "NOT_OWNER"
  | "ALREADY_VERIFIED"
  | "ALREADY_PENDING"
  | "BLOCKED"
  | "NO_TOKENS"
  | "ENTITY_NOT_FOUND"
  | "UNKNOWN";

const MESSAGES: Record<VerificationErrorCode, string> = {
  NOT_OWNER: "Only the creator of this spot can request a review.",
  ALREADY_VERIFIED: "This spot is already verified.",
  ALREADY_PENDING: "A review request is already pending for this spot.",
  BLOCKED: "You can't request another review yet — try again later.",
  NO_TOKENS: "You don't have any review requests left.",
  ENTITY_NOT_FOUND: "This spot could not be found.",
  UNKNOWN: "Couldn't request a review — try again.",
};

export class VerificationError extends Error {
  code: VerificationErrorCode;
  constructor(code: VerificationErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toVerificationError(error: { message: string }): VerificationError {
  const code = (Object.keys(MESSAGES) as VerificationErrorCode[]).find((c) =>
    error.message.includes(c)
  );
  return new VerificationError(code ?? "UNKNOWN");
}

export async function requestSpotVerification(spotId: string): Promise<string> {
  const { data, error } = await supabase.rpc("request_spot_verification", { p_spot_id: spotId });
  if (error) throw toVerificationError(error);
  return data as string;
}
