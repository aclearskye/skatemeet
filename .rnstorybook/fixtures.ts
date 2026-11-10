// Shared sample data for component stories. Not used by the app.
import type { ReviewableCard } from "@/components/common/ReviewCard";
import type { Profile } from "@/lib/context/use-auth-context";
import type { PostWithPeople } from "@/lib/posts/listQueries";
import type { EntityMetadataBase } from "@/lib/shared/types";
import type { OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/types";
import type { UserStore } from "@/lib/stores/types";

export const SAMPLE_DATE = "2026-10-01T15:30:00.000Z";
export const SAMPLE_PHOTO = "https://picsum.photos/seed/skatemeet/600/400";
export const SAMPLE_AVATAR = "https://picsum.photos/seed/skater/200/200";
export const SAMPLE_UUID = "00000000-0000-4000-8000-000000000001";

export const SAMPLE_SPOT: SkateSpot = {
  spot_id: SAMPLE_UUID,
  created_by: SAMPLE_UUID,
  name: "Southbank Undercroft",
  type: "street",
  description: "Banks, ledges and a lot of history.",
  latitude: 51.5069,
  longitude: -0.1167,
  photo_url: SAMPLE_PHOTO,
  rating_avg: 4.2,
  rating_count: 9,
  difficulty_avg: 3.4,
  difficulty_count: 5,
  smoothness_avg: 2.1,
  smoothness_count: 4,
  labels: [
    { text: "ledges", color: "primary" },
    { text: "covered", color: "tertiary" },
  ],
  is_verified: true,
  upvote_count: 42,
  created_at: SAMPLE_DATE,
  updated_at: SAMPLE_DATE,
};

export const SAMPLE_DIY: SkateSpot = {
  ...SAMPLE_SPOT,
  name: "Under the Bridge DIY",
  type: "diy",
  is_verified: false,
  labels: [{ text: "quarter-pipe", color: "secondary" }],
};

export const SAMPLE_OSM_SPOT: OsmSpot = {
  place_id: "osm-spot-1",
  name: "Stockwell Skatepark",
  address: "Stockwell Rd, London",
  spot_type: "park",
  coordinates: { lat: 51.4723, lng: -0.1229 },
  upvote_count: 18,
  cover_photo_url: SAMPLE_PHOTO,
  description: null,
  osm_image_url: null,
};

export const SAMPLE_OSM_STORE: OsmStore = {
  place_id: "osm-store-1",
  name: "Slam City Skates",
  address: "Brewer St, London",
  phone: "+44 20 0000 0000",
  website: "https://example.com",
  opening_hours: "Mo-Sa 10:00-19:00",
  coordinates: { lat: 51.5113, lng: -0.1357 },
  upvote_count: 30,
  cover_photo_url: SAMPLE_PHOTO,
  description: null,
  osm_image_url: null,
};

export const SAMPLE_USER_STORE: UserStore = {
  store_id: SAMPLE_UUID,
  profile_id: SAMPLE_UUID,
  name: "Bowl & Bearing",
  address: "12 Example St, London",
  latitude: 51.52,
  longitude: -0.1,
  phone: "+44 20 0000 0000",
  website: "https://example.com",
  opening_hours: "Mon-Sat 10-6",
  description: "Decks, wheels, bearings and coffee.",
  photo_url: SAMPLE_PHOTO,
  is_verified: true,
  upvote_count: 12,
  created_at: SAMPLE_DATE,
  updated_at: SAMPLE_DATE,
};

export const SAMPLE_REVIEW: ReviewableCard = {
  review_id: SAMPLE_UUID,
  profile_id: SAMPLE_UUID,
  heading: "Smooth ground, great ledges",
  upvote_count: 5,
  rating: 4,
  comment: "Gets busy at weekends but early mornings are perfect.",
  created_at: SAMPLE_DATE,
  profiles: { username: "kickflip_kai", display_name: "Kai" },
};

const OPEN = { closed: false, open: "09:00", close: "21:00" };

export const SAMPLE_METADATA: EntityMetadataBase = {
  metadata_id: SAMPLE_UUID,
  osm_place_id: null,
  opening_hours: {
    mon: OPEN,
    tue: OPEN,
    wed: OPEN,
    thu: OPEN,
    fri: OPEN,
    sat: { closed: false, open: "10:00", close: "18:00" },
    sun: { closed: true, open: null, close: null },
  },
  facilities: ["restrooms", "seating", "water_fountain"],
  parking: "street",
  pet_friendly: true,
  paid: false,
  well_lit: true,
  last_updated_by: SAMPLE_UUID,
  updated_at: SAMPLE_DATE,
};

export const SAMPLE_VIDEO = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export const SAMPLE_PERSON = {
  profileId: SAMPLE_UUID,
  username: "kickflip_kai",
  displayName: "Kai",
  avatarUrl: SAMPLE_AVATAR,
};

export const SAMPLE_POST: PostWithPeople = {
  postId: SAMPLE_UUID,
  profileId: SAMPLE_UUID,
  mediaType: "photo",
  caption: "First try at the ledge #southbank",
  status: "published",
  entityTag: { kind: "spot", spotId: SAMPLE_UUID },
  pinnedAt: null,
  archivedAt: null,
  likeCount: 24,
  createdAt: SAMPLE_DATE,
  publishedAt: SAMPLE_DATE,
  media: [
    {
      mediaId: SAMPLE_UUID,
      position: 0,
      mediaType: "photo",
      mediaUrl: "https://picsum.photos/seed/skatepost/1080/1350",
      thumbnailUrl: null,
      width: 1080,
      height: 1350,
      durationSeconds: null,
    },
  ],
  author: SAMPLE_PERSON,
  taggedSkaters: [],
  pendingSkaters: [],
};

export const SAMPLE_PROFILE: Profile = {
  profile_id: SAMPLE_UUID,
  username: "kickflip_kai",
  first_name: "Kai",
  last_name: "Rivers",
  display_name: "Kai",
  onboarding_completed: true,
  account_type: "user",
  business_name: null,
  business_verified_at: null,
  disciplines: ["street", "park"],
  skill_level: "intermediate",
  city: "London",
  bio: "Ledges and long lines.",
  pronouns: "they/them",
  labels: [{ text: "goofy", color: "tertiary" }],
  avatar_url: SAMPLE_AVATAR,
  is_admin: false,
  is_private: false,
  age_confirmed_at: SAMPLE_DATE,
};
