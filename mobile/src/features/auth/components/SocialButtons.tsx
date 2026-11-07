import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { AppText } from "../../../shared/ui/AppText";
import { GoogleMark } from "../../../shared/brand/GoogleMark";
import { colors, radii } from "../../../shared/theme/tokens";
import type { SocialAvailability } from "../social";

type AppleModule = typeof import("expo-apple-authentication");
const appleSdk: AppleModule | null =
  Platform.OS === "ios" ? require("expo-apple-authentication") : null;

/**
 * Apple uses the system button (Apple-approved look, localized title, VoiceOver
 * label) and is listed first and at the same size as Google, as Apple's HIG asks.
 * Google follows its branding: white fill, neutral outline, unaltered mark.
 */
export function SocialButtons({
  available,
  busy,
  disabled = false,
  onApple,
  onGoogle,
}: {
  available: SocialAvailability;
  busy: "google" | "apple" | null;
  disabled?: boolean;
  onApple(): void;
  onGoogle(): void;
}) {
  if (!available.apple && !available.google) return null;
  return (
    <View style={{ gap: 12 }}>
      {available.apple && appleSdk ? (
        <View
          style={{ opacity: disabled ? 0.6 : 1 }}
          pointerEvents={disabled ? "none" : "auto"}
          accessibilityState={{ disabled, busy: busy === "apple" }}
        >
          <appleSdk.AppleAuthenticationButton
            buttonType={appleSdk.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={appleSdk.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radii.control}
            style={{ height: 52, width: "100%" }}
            onPress={onApple}
          />
        </View>
      ) : null}
      {available.google ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar con Google"
          accessibilityState={{ disabled, busy: busy === "google" }}
          disabled={disabled}
          onPress={onGoogle}
          style={({ pressed }) => ({
            minHeight: 52,
            borderRadius: radii.control,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: pressed ? colors.ground : colors.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingHorizontal: 16,
            opacity: disabled && busy !== "google" ? 0.6 : 1,
          })}
        >
          {busy === "google" ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <GoogleMark />
          )}
          <AppText variant="label" style={{ color: colors.ink }}>
            Continuar con Google
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
