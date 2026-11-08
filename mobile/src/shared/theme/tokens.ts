/**
 * «Vidrio de bosque» (v4): one palette per system scheme. `colors` and
 * `categoryPalette` are mutated in place by `applyColorScheme`, and the root layout
 * remounts the tree when the scheme changes, so every inline style re-reads them.
 * Fill tokens (forest*, dangerFill) hold light text; ink tokens (accent, danger,
 * expense, ink*) are for text and icons on the ground or a surface. Contrast ratios
 * are listed in docs/engineering/design-system.md.
 */
const lightColors = {
  forest950: "#10291D",
  forest900: "#163828",
  forest700: "#1E4634",
  forest600: "#2D5E46",
  accent: "#1E4634",
  progress: "#5E8B6A",
  sage300: "#A8BFA3",
  sage100: "#E0E9E2",
  mint: "#CFE3D2",
  track: "#DCE3DE",
  ground: "#E9EEEA",
  surface: "#FFFFFF",
  cream: "#F3E6DE",
  creamInk: "#3B2F2A",
  cheek: "#E8A9A2",
  ink: "#0E1712",
  inkMuted: "#47534C",
  inkSubtle: "#5F6B64",
  onForest: "#F4F7F2",
  onForestMuted: "#C9D8C6",
  expense: "#8C3A4E",
  danger: "#8C3A4E",
  dangerFill: "#8C3A4E",
  expenseTint: "#F4E4E7",
  warning: "#8A5A00",
  border: "#CFD8D2",
  borderStrong: "#7D8781",
  transparent: "transparent",
  forestGlass: "rgba(244,247,242,0.08)",
  forestGlassStrong: "rgba(244,247,242,0.18)",
  glass: "rgba(255,255,255,0.6)",
  glassStrong: "rgba(250,252,251,0.82)",
  glassBorder: "rgba(255,255,255,0.9)",
  glowA: "#B9E2C7",
  glowB: "#CFDCD2",
  scrim: "rgba(14,23,18,0.32)",
  shadow: "#1B3326",
};
export type ColorToken = keyof typeof lightColors;
export type ColorScheme = "light" | "dark";
const darkColors: Record<ColorToken, string> = {
  forest950: "#143426",
  forest900: "#1C4433",
  forest700: "#2E6A4F",
  forest600: "#8FD9AE",
  accent: "#8FD9AE",
  progress: "#7FC49A",
  sage300: "#A8BFA3",
  sage100: "#1B2621",
  mint: "#2C5A44",
  track: "#26302B",
  ground: "#0A100D",
  surface: "#141B17",
  cream: "#2B2522",
  creamInk: "#F3E6DE",
  cheek: "#E8A9A2",
  ink: "#F1F4F0",
  inkMuted: "#A3AEA7",
  inkSubtle: "#909B94",
  onForest: "#F4F7F2",
  onForestMuted: "#C9D8C6",
  expense: "#F2A1B1",
  danger: "#F2A1B1",
  dangerFill: "#A84459",
  expenseTint: "#3A1E25",
  warning: "#E8B65C",
  border: "#27312C",
  borderStrong: "#6B766F",
  transparent: "transparent",
  forestGlass: "rgba(244,247,242,0.08)",
  forestGlassStrong: "rgba(244,247,242,0.18)",
  glass: "rgba(255,255,255,0.06)",
  glassStrong: "rgba(22,30,26,0.86)",
  glassBorder: "rgba(255,255,255,0.11)",
  glowA: "#2F7464",
  glowB: "#1E4634",
  scrim: "rgba(0,0,0,0.55)",
  shadow: "#000000",
};
export const colors: Record<ColorToken, string> = { ...lightColors };
/**
 * Category hues: earthy, muted tones that sit next to the forest without competing.
 * Light: `ink` on `tint` ≥ 6.2:1 (icons and text); `chart` on white ≥ 3.8:1 (WCAG 1.4.11).
 * Dark: tints are deep, inks light. Colour never carries meaning alone: every use
 * sits next to the category name.
 */
type Tone = { tint: string; ink: string; chart: string };
type ToneName =
  "salary" | "income" | "food" | "transport" | "services" | "other" | "custom";
const lightCategories: Record<ToneName, Tone> = {
  salary: { tint: "#E2EBDF", ink: "#1E4634", chart: "#2D5E46" },
  income: { tint: "#DCEBE7", ink: "#1D5247", chart: "#2F7464" },
  food: { tint: "#F7E2D8", ink: "#8A3A20", chart: "#B5532F" },
  transport: { tint: "#DFE7F0", ink: "#284766", chart: "#47698F" },
  services: { tint: "#F5EAD0", ink: "#6E4E00", chart: "#A57A12" },
  other: { tint: "#EEE2EC", ink: "#673660", chart: "#8C5683" },
  custom: { tint: "#ECE8DF", ink: "#4A514B", chart: "#7A7F78" },
};
const darkCategories: Record<ToneName, Tone> = {
  salary: { tint: "#1C2E24", ink: "#A7D8B9", chart: "#6FB58A" },
  income: { tint: "#18302A", ink: "#9AD9C6", chart: "#5FB39C" },
  food: { tint: "#3A2219", ink: "#F2B39A", chart: "#E07A55" },
  transport: { tint: "#1C2838", ink: "#A9C4E6", chart: "#7DA3D1" },
  services: { tint: "#352B14", ink: "#E8CB7F", chart: "#C9A23E" },
  other: { tint: "#33202F", ink: "#E3B2DA", chart: "#B983AE" },
  custom: { tint: "#262923", ink: "#C5CBC4", chart: "#9AA096" },
};
export const categoryPalette: Record<ToneName, Tone> = Object.fromEntries(
  Object.entries(lightCategories).map(([k, v]) => [k, { ...v }]),
) as Record<ToneName, Tone>;
export type CategoryTone = Tone;
let currentScheme: ColorScheme = "light";
const schemeListeners = new Set<() => void>();
export function getColorScheme() {
  return currentScheme;
}
/** Registers a rebuild for values derived from the palette at module scope. */
export function onColorScheme(listener: () => void) {
  schemeListeners.add(listener);
  return () => schemeListeners.delete(listener);
}
/** Swaps the palette in place; returns true when it changed. */
export function applyColorScheme(scheme: ColorScheme) {
  if (scheme === currentScheme) return false;
  currentScheme = scheme;
  Object.assign(colors, scheme === "dark" ? darkColors : lightColors);
  const source = scheme === "dark" ? darkCategories : lightCategories;
  for (const name of Object.keys(source) as ToneName[])
    Object.assign(categoryPalette[name], source[name]);
  schemeListeners.forEach((listener) => listener());
  return true;
}
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
  /** The one protagonist figure per screen (Inicio's net flow, the amount being typed). */
  amount: {
    fontSize: 52,
    lineHeight: 60,
    fontWeight: "300",
    letterSpacing: -2,
  },
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
    shadowColor: "#1B3326",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  floating: {
    shadowColor: "#143325",
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
  /** Half of Monedin's breath (in or out); a full breath is ~3.4 s. */
  breath: 1700,
} as const;
export const curves = {
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
} as const;
