/**
 * Hex mirrors of `@theme` / DESIGN.md — use for SVG fills and `style={{}}`.
 * Prefer Tailwind token classes (`bg-espresso`, `text-text-primary`, …) in JSX.
 */
export const tokens = {
  bgBase: "#FAF6F0",
  bgWarm: "#F5EFE6",
  surface: "#FFFFFF",
  textPrimary: "#3A2E22",
  textSecondary: "#8A7A6C",
  espresso: "#6F4E37",
  terracotta: "#C97B4A",
  clay: "#8B5E3C",
  olive: "#7A8450",
  border: "#E6DCCB",
  borderStrong: "#D6C5B3",
  sand: "#F5E8D8",
  success: "#5C7A52",
  /** Deep roast — customer portal dark heroes. */
  ink: "#241610",
  inkLift: "#3A2418",
  onDark: "#F6EBDC",
  onDarkMuted: "#E3D2BB",
  onDarkSoft: "#CDB9A0",
  onEspresso: "#FAF6F0",
} as const

/**
 * OrderStart / customer-marketing aliases — same Warm Roast system as B2B.
 * Keeps short names used across SVG + inline styles without a parallel palette.
 */
export const C = {
  ink: tokens.textPrimary,
  cream: tokens.bgBase,
  sand: tokens.sand,
  line: tokens.border,
  mute: tokens.textSecondary,
  soft: tokens.onDarkSoft,
  creamText: tokens.onDark,
  creamMute: tokens.onDarkMuted,
  dark: tokens.ink,
  dark2: tokens.inkLift,
  accent: tokens.terracotta,
  roast: tokens.clay,
  green: tokens.success,
} as const
