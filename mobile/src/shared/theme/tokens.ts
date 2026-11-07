/**
 * «Brote» v2: deep forest for action and key data, warm paper neutrals so green
 * stays an accent, Monedin's cream and sage for personality. Contrast ratios are
 * listed in docs/engineering/design-system.md.
 */
export const colors = {
  forest950: "#10291D",
  forest900: "#163828",
  forest700: "#1E4634",
  forest600: "#2D5E46",
  progress: "#5E8B6A",
  sage300: "#A8BFA3",
  sage100: "#E2EBDF",
  mint: "#CFE3D2",
  track: "#E8E4DA",
  ground: "#F5F3EE",
  surface: "#FFFFFF",
  cream: "#F3E6DE",
  creamInk: "#3B2F2A",
  cheek: "#E8A9A2",
  ink: "#141D18",
  inkMuted: "#545C56",
  inkSubtle: "#6B716C",
  onForest: "#F4F7F2",
  onForestMuted: "#C9D8C6",
  expense: "#8C3A4E",
  danger: "#8C3A4E",
  warning: "#8A5A00",
  border: "#D9D4C8",
  borderStrong: "#848780",
  transparent: "transparent",
  forestGlass: "rgba(244,247,242,0.08)",
  forestGlassStrong: "rgba(244,247,242,0.18)",
} as const;
/**
 * Category hues: earthy, muted tones that sit next to the forest without competing.
 * `ink` on `tint` ≥ 6.2:1 (icons and text); `chart` on white ≥ 3.8:1 (WCAG 1.4.11).
 * Colour never carries meaning alone: every use sits next to the category name.
 */
export const categoryPalette = {
  salary: { tint: "#E2EBDF", ink: "#1E4634", chart: "#2D5E46" },
  income: { tint: "#DCEBE7", ink: "#1D5247", chart: "#2F7464" },
  food: { tint: "#F7E2D8", ink: "#8A3A20", chart: "#B5532F" },
  transport: { tint: "#DFE7F0", ink: "#284766", chart: "#47698F" },
  services: { tint: "#F5EAD0", ink: "#6E4E00", chart: "#A57A12" },
  other: { tint: "#EEE2EC", ink: "#673660", chart: "#8C5683" },
  custom: { tint: "#ECE8DF", ink: "#4A514B", chart: "#7A7F78" },
} as const;
export type CategoryTone = (typeof categoryPalette)[keyof typeof categoryPalette];
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
} as const;
export const radii = {
  sm: 8,
  md: 12,
  control: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;
export const typography = {
  hero: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  title: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  subhead: { fontSize: 17, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
} as const;
export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  floating: {
    shadowColor: colors.forest700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
export const durations = {
  press: 120,
  release: 160,
  month: 220,
  reducedMonth: 150,
  progress: 280,
  stagger: 40,
  sprout: 150,
  bannerIn: 240,
  bannerOut: 200,
  entrance: 320,
  sheet: 420,
  idleCycle: 2400,
} as const;
export const curves = {
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
} as const;
