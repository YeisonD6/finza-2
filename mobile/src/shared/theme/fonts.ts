import {
  useFonts,
  Manrope_300Light,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
export const fontFamily = {
  amount: "Manrope_300Light",
  hero: "Manrope_800ExtraBold",
  display: "Manrope_800ExtraBold",
  title: "Manrope_700Bold",
  heading: "Manrope_700Bold",
  subhead: "Manrope_600SemiBold",
  body: "Manrope_500Medium",
  label: "Manrope_600SemiBold",
  caption: "Manrope_500Medium",
} as const;
export function useAppFonts() {
  return useFonts({
    Manrope_300Light,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
}
