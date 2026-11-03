export type BlockedProfile = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

export type BlockErrorCode = "CANNOT_BLOCK_SELF" | "UNKNOWN";
