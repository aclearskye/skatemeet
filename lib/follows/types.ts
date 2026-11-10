export type FollowDirection = "followers" | "following";

export type FollowCounts = { followers: number; following: number };

export type FollowListItem = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  viewerFollows: boolean;
};
