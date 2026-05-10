export const C = {
  // Backgrounds
  bg: "#131313",
  bgLowest: "#0e0e0e",
  bgLow: "#1c1b1b",
  bgMid: "#201f1f",

  // Surfaces
  surface: "#201f1f",
  surfaceLow: "#1c1b1b",
  surfaceHigh: "#2a2a2a",
  surfaceHighest: "#353534",
  surfaceBright: "#393939",

  // Text
  text: "#e5e2e1",
  textVariant: "#c4c9ac",
  muted: "#8e9379",
  inverseText: "#313030",

  // Borders
  border: "#2a2a2a",
  borderVariant: "#444933",

  // Accents — Neon Green (Primary)
  primary: "#abd600",
  primaryBright: "#c3f400",
  onPrimary: "#283500",
  onPrimaryContainer: "#556d00",
  inversePrimary: "#506600",

  // Accents — Electric Orange (Secondary)
  secondary: "#fe6500",
  secondaryLight: "#ffb596",
  onSecondary: "#541d00",

  // Accents — Electric Blue (Tertiary)
  tertiary: "#a5eeff",
  onTertiary: "#006f7f",

  // Semantic
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",
  errorDim: "#93000a33",
  errorBorder: "#93000a88",

  // Discord
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
  labelTape:  { fontFamily: F.monoRegular,  fontSize: 14, lineHeight: 14 },
};

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
