// Rebased on docs/theme/sk8meet-design-system.md v1.0 (single source of truth
// for brand color — update that file first, then propagate here). Tokens
// below map 1:1 to the doc's core tokens where one exists (bg, surface,
// surface-2/surfaceHigh, ink/text, ink-dim/muted, chartreuse/primary,
// orange/secondary, cyan/tertiary, and border -> ink per color rule 2.3).
// Extra tiers the app needs that the doc doesn't define (bgLowest/bgLow/
// bgMid, surfaceLow/surfaceHighest/surfaceBright, textVariant) are
// extrapolated to fit the same near-black/near-white ramp, preserving their
// prior relative brightness ordering.
export const C = {
  // Backgrounds
  bg: "#0A0A0A",
  bgLowest: "#0A0A0A",
  bgLow: "#151515",
  bgMid: "#1E1E1E",

  // Surfaces
  surface: "#151515",
  surfaceLow: "#101010",
  surfaceHigh: "#1E1E1E",
  surfaceHighest: "#2C2C2C",
  surfaceBright: "#383838",

  // Text
  text: "#F2F2F0",
  textVariant: "#C6C6C2",
  muted: "#9C9C96",
  inverseText: "#0A0A0A",

  // Borders — structural borders always use ink, never a dim grey (design
  // system rule 2.3). borderVariant maps to the doc's --line, reserved for
  // hairline internal dividers only.
  border: "#F2F2F0",
  borderVariant: "#2C2C2C",

  // Accents — Chartreuse (Primary)
  primary: "#D8F927",
  primaryBright: "#D8F927",
  onPrimary: "#0A0A0A",
  onPrimaryContainer: "#B8D81F",
  inversePrimary: "#B8D81F",

  // Accents — Orange (Secondary)
  secondary: "#FF5C1F",
  secondaryLight: "#FFB596",
  onSecondary: "#0A0A0A",

  // Accents — Cyan (Tertiary)
  tertiary: "#35E8FF",
  onTertiary: "#0A0A0A",

  // Gold (Competitions) — not one of the core three neons (design system
  // 2.3's "one neon dominates" rule is about primary/secondary/tertiary),
  // reserved for competition/trophy surfaces (e.g. COMP/UPCOMING badges).
  // Sourced from the actual trophy icon art, not picked independently.
  gold: "#F6C64B",
  onGold: "#372807",

  // Duct Tape (physical-tape-texture accents, outside the core neon trio).
  // tape is the neutral label chip; tapeOrange/tapeRed step up in urgency
  // for a "gaffer tape" warning and a "busted/alert" strip.
  tape: "#E8E4D8",
  onTape: "#0A0A0A",
  tapeOrange: "#FF8A3D",
  onTapeOrange: "#0A0A0A",
  tapeRed: "#C8302A",
  onTapeRed: "#F2F2F0",

  // Semantic — danger aliases to orange per design system 2.2 ("--danger
  // points to --orange"), not a separate hue.
  error: "#FF5C1F",
  onError: "#0A0A0A",
  errorContainer: "#541D00",
  onErrorContainer: "#FFB596",
  errorDim: "#FF5C1F33",
  errorBorder: "#FF5C1F88",

  // Discord (third-party brand color, outside the design system)
  discord: "#5865F2",
};

export const F = {
  display: "Anton_400Regular",
  heading: "Anton_400Regular",
  body: "HankenGrotesk_400Regular",
  bodyMedium: "HankenGrotesk_500Medium",
  bodySemiBold: "HankenGrotesk_600SemiBold",
  bodyBold: "HankenGrotesk_700Bold",
  mono: "SpaceMono_700Bold",
  monoRegular: "SpaceMono_400Regular",
};

// Typography scale — letterSpacing converted from em to points
export const TS = {
  displayLg:  { fontFamily: F.display,      fontSize: 48, lineHeight: 44, letterSpacing: -0.96 },
  headlineLg: { fontFamily: F.heading,      fontSize: 32, lineHeight: 32, letterSpacing: 0.32 },
  headlineMd: { fontFamily: F.heading,      fontSize: 24, lineHeight: 24, letterSpacing: 0.48 },
  bodyLg:     { fontFamily: F.body,         fontSize: 18, lineHeight: 28 },
  bodyMd:     { fontFamily: F.body,         fontSize: 16, lineHeight: 24 },
  labelCaps:  { fontFamily: F.mono,         fontSize: 12, lineHeight: 16 },
  labelTape:  { fontFamily: F.mono,         fontSize: 13, letterSpacing: 1 },
};

// Duct tape label recipe (docs/theme/sk8meet-theme-sheet.html — "Component
// recipes" section). Used only by components/common/DuctTapeLabel, which
// memoizes the result per mount so it stays put across re-renders but comes
// out different on every remount (e.g. a page refresh re-rolls every tape
// label's angle, and same-color labels in a row no longer all match).
export function randomTapeRotation(): string {
  const deg = -2 + Math.random() * 4; // -2deg..2deg
  return `${deg.toFixed(2)}deg`;
}

// Spacing scale — 4px base unit
export const SP = {
  unit:          4,
  gutter:        16,
  marginMobile:  16,
  marginDesktop: 32,
  stackSm:        8,
  stackMd:       20,
  stackLg:       40,
};

export const R = 0; // border radius — always 0 per design system

const AVATAR_PALETTE: [bg: string, text: string][] = [
  [C.primary, C.onPrimary],
  [C.secondary, C.onSecondary],
  [C.tertiary, C.onTertiary],
];

export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

export function avatarColor(seed: string | null | undefined): [bg: string, text: string] {
  let hash = 0;
  const s = seed ?? "";
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
