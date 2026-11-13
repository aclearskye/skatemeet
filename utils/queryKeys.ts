import { Coordinates, Tile, tileKey } from "@/lib/map/types";
import { EntityRef } from "@/lib/checkins/types";

export const queryKeys = {
  spotDetail: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId] as const,
  storeDetail: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId] as const,
  spotPhotos: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId, "photos"] as const,
  storePhotos: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId, "photos"] as const,
  spotRatings: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId, "ratings"] as const,
  // Nested under spotRatings so invalidating that prefix covers both.
  mySpotRatings: (spotId: string | null, osmPlaceId: string | null, profileId: string) =>
    ["spot", spotId, osmPlaceId, "ratings", "mine", profileId] as const,
  spotMetadata: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId, "metadata"] as const,
  storeMetadata: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId, "metadata"] as const,
  mapOsmMarkersBase: ["map", "osmMarkers"] as const,
  mapOsmTile: (tile: Tile) => ["map", "osmMarkers", tileKey(tile)] as const,
  mapUserMarkersBase: ["map", "userMarkers"] as const,
  mapUserTile: (tile: Tile) => ["map", "userMarkers", tileKey(tile)] as const,
  entitySearch: (query: string) => ["search", "entities", query] as const,
  entitySearchNearby: (query: string, coords: Coordinates) =>
    ["search", "entitiesNearby", query, coords.lat, coords.lng] as const,
  profileStats: (profileId: string) =>
    ["profile", profileId, "stats"] as const,
  // Nested under profileStats so invalidating that prefix still covers it.
  friendCount: (profileId: string) =>
    ["profile", profileId, "stats", "friends"] as const,
  profileFavorites: (profileId: string) =>
    ["profile", profileId, "favorites"] as const,
  profileXp: (profileId: string) =>
    ["profile", profileId, "xp"] as const,
  notifications: (profileId: string) =>
    ["notifications", profileId] as const,
  notificationsUnreadCount: (profileId: string) =>
    ["notifications", profileId, "unreadCount"] as const,
  checkInStatus: (profileId: string) =>
    ["checkIn", profileId, "status"] as const,
  liveCount: (ref: EntityRef) =>
    ["checkIn", "liveCount", ref.spotId, ref.osmSpotPlaceId, ref.storeId, ref.osmStorePlaceId] as const,
  liveCountsTile: (tile: Tile) =>
    ["checkIn", "liveCounts", tileKey(tile)] as const,
  spotVerificationStatus: (spotId: string) =>
    ["spot", spotId, "verification"] as const,
  userStreak: (profileId: string) =>
    ["profile", profileId, "streak"] as const,
  hasManualCheckIn: (entityKey: string) =>
    ["checkIn", entityKey, "hasManual"] as const,
  adminVerificationQueue: () =>
    ["admin", "verificationQueue"] as const,
  adminPhotoReports: () =>
    ["admin", "photoReports"] as const,
  adminReviewReports: () =>
    ["admin", "reviewReports"] as const,
  adminBanHistory: (profileId: string) =>
    ["admin", "banHistory", profileId] as const,
  adminProfileReports: () =>
    ["admin", "profileReports"] as const,
  adminBanAppeals: () =>
    ["admin", "banAppeals"] as const,
  adminDeletionEligible: () =>
    ["admin", "deletionEligible"] as const,
  profileReportStatus: (profileId: string) =>
    ["profile", profileId, "reportStatus"] as const,
  banAppealStatus: (profileId: string) =>
    ["profile", profileId, "banAppealStatus"] as const,
  myBanReason: (profileId: string) =>
    ["profile", profileId, "banReason"] as const,
  // Per viewer: results depend on who's searching (privacy, blocks, self).
  userSearch: (profileId: string, query: string) =>
    ["search", "users", profileId, query] as const,
  friendStatus: (profileId: string, otherId: string) =>
    ["profile", profileId, "friendStatus", otherId] as const,
  friendsList: (profileId: string) =>
    ["profile", profileId, "friends"] as const,
  chatList: (profileId: string) =>
    ["chats", profileId, "list"] as const,
  chatSummary: (conversationId: string) =>
    ["chat", conversationId, "summary"] as const,
  chatMessages: (conversationId: string) =>
    ["chat", conversationId, "messages"] as const,
  chatReadReceipt: (conversationId: string) =>
    ["chat", conversationId, "readReceipt"] as const,
  chatUnreadCount: (profileId: string) =>
    ["chats", profileId, "unreadCount"] as const,
  blockStatus: (profileId: string, otherId: string) =>
    ["profile", profileId, "blockStatus", otherId] as const,
  myBlocks: (profileId: string) =>
    ["profile", profileId, "blocks"] as const,
  profileCard: (profileId: string) =>
    ["profile", profileId, "card"] as const,
  // Another user's full row -- null while RLS hides it (private non-friend,
  // blocked or deleted).
  userProfile: (profileId: string) =>
    ["profile", profileId, "full"] as const,
  adminMessageReports: () =>
    ["admin", "messageReports"] as const,
  adminMessageReportDetail: (reportId: string) =>
    ["admin", "messageReports", reportId] as const,
  // Keyed by spot (spotChatKey), not room: a spot has no room until the
  // first join.
  spotChatRoom: (spotKey: string) =>
    ["spotChat", spotKey, "room"] as const,
  spotChatMessages: (roomId: string) =>
    ["spotChat", roomId, "messages"] as const,
  // The viewer's joined spot chats, for the Chats tab.
  mySpotChats: (profileId: string) =>
    ["spotChat", "mine", profileId] as const,
  adminSpotChatReports: () =>
    ["admin", "spotChatReports"] as const,
  adminSpotChatReportDetail: (reportId: string) =>
    ["admin", "spotChatReports", reportId] as const,
  adminHeldPosts: () =>
    ["admin", "heldPosts"] as const,
  adminCaptionFlags: () =>
    ["admin", "captionFlags"] as const,
  adminCsamHolds: () =>
    ["admin", "csamHolds"] as const,
  // Signed quarantine URLs expire, so they're cached per media path.
  adminHeldMediaUrl: (bucket: string, path: string) =>
    ["admin", "heldMediaUrl", bucket, path] as const,
  adminHeldVideoPreview: (postId: string) =>
    ["admin", "heldVideoPreview", postId] as const,
  post: (postId: string) =>
    ["post", postId] as const,
  profilePosts: (profileId: string) =>
    ["profile", profileId, "posts"] as const,
  profilePostCount: (profileId: string) =>
    ["profile", profileId, "postCount"] as const,
  myPendingPosts: (profileId: string) =>
    ["profile", profileId, "pendingPosts"] as const,
  taggedPosts: (profileId: string) =>
    ["profile", profileId, "taggedPosts"] as const,
  savedPosts: (profileId: string) =>
    ["profile", profileId, "savedPosts"] as const,
  archivedPosts: (profileId: string) =>
    ["profile", profileId, "archivedPosts"] as const,
  followCounts: (profileId: string) =>
    ["profile", profileId, "followCounts"] as const,
  followStatus: (viewerId: string, profileId: string) =>
    ["follow", viewerId, profileId] as const,
  followListBase: (profileId: string) =>
    ["profile", profileId, "follows"] as const,
  followList: (profileId: string, direction: string, query: string) =>
    ["profile", profileId, "follows", direction, query] as const,
  feedBase: ["feed"] as const,
  // Outside the "feed" prefix on purpose: only a newly published own post
  // re-pins it (useFeed); other feed invalidations keep the scroll position.
  feedAsOf: (tab: string) => ["feedAsOf", tab] as const,
  feedAsOfBase: ["feedAsOf"] as const,
  feed: (tab: string, asOf: string) =>
    ["feed", tab, asOf] as const,
  postLikeStatuses: (viewerId: string, postIds: string[]) =>
    ["posts", "likeStatus", viewerId, [...postIds].sort().join(",")] as const,
  postSaveStatuses: (viewerId: string, postIds: string[]) =>
    ["posts", "saveStatus", viewerId, [...postIds].sort().join(",")] as const,
  entityPosts: (entityKey: string) =>
    ["posts", "entity", entityKey] as const,
  entityTagLabel: (focusKey: string) =>
    ["posts", "entityTagLabel", focusKey] as const,
  cachedLocation: () =>
    ["location", "cached"] as const,
  nearbyEntityTags: (location: { lat: number; lng: number }) =>
    ["posts", "nearbyEntityTags", location.lat.toFixed(3), location.lng.toFixed(3)] as const,
};
