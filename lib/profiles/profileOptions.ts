// The choices a skater picks from for their profile's skill level and
// disciplines. Shared by onboarding and the profile editor
// (components/profile/EditProfileSheet). profiles.skill_level and
// profiles.disciplines store the ids.

export const DISCIPLINES = [
  { id: "street", label: "Street" },
  { id: "park", label: "Park" },
  { id: "bowl", label: "Bowl" },
  { id: "vert", label: "Vert / Ramps" },
  { id: "transition", label: "Transition" },
  { id: "flatground", label: "Flatground" },
  { id: "cruising", label: "Cruising" },
  { id: "downhill", label: "Downhill" },
] as const;

export const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Just Dropped In",
    desc: "Started skating recently",
  },
  {
    id: "intermediate",
    label: "Still Popping",
    desc: "Getting the basics down",
  },
  {
    id: "dialed",
    label: "Dialed In",
    desc: "Solid tricks, skating spots",
  },
  {
    id: "expert",
    label: "On Lock",
    desc: "Consistent bangers",
  },
  {
    id: "pro",
    label: "Out Here Filming",
    desc: "Retired from trying (but not really)",
  },
] as const;
