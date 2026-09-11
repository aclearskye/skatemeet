export type CheckInRequiredErrorCode = "NOT_CHECKED_IN" | "UNKNOWN";

export class CheckInRequiredError extends Error {
  code: CheckInRequiredErrorCode;
  constructor(code: CheckInRequiredErrorCode, action: string) {
    super(
      code === "NOT_CHECKED_IN"
        ? `You need to check in here before you can ${action}.`
        : "Something went wrong — try again."
    );
    this.code = code;
  }
}

export function toCheckInRequiredError(error: { message: string }, action: string): CheckInRequiredError {
  const code: CheckInRequiredErrorCode = error.message.includes("NOT_CHECKED_IN") ? "NOT_CHECKED_IN" : "UNKNOWN";
  return new CheckInRequiredError(code, action);
}
