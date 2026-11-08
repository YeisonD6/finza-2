import { useEffect, useRef, type ElementRef, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { Monedin } from "../../../shared/brand/Monedin";
import { AppText } from "../../../shared/ui/AppText";
import { IconButton } from "../../../shared/ui/IconButton";
import { focusAccessibility } from "../../../shared/accessibility/announcements";
import { colors, useThemeRefresh } from "../../../shared/theme/tokens";
import { useEntrance } from "../../../shared/theme/entrance";

/**
 * Shared frame for sign-in, sign-up and recovery: warm paper, a quiet header
 * (Monedin small, one heading, one supporting line) and the form below.
 * The heading takes accessibility focus on mount; Android Back follows onBack.
 */
export function AuthShell({
  title,
  subtitle,
  onBack,
  backDisabled = false,
  mascot = true,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onBack?(): void;
  backDisabled?: boolean;
  mascot?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useThemeRefresh();
  const heading = useRef<ElementRef<typeof Text>>(null);
  const block = useEntrance(3);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      focusAccessibility(heading.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [title]);
  useEffect(() => {
    if (!onBack || Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!backDisabled) onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack, backDisabled]);
  return (
    <SafeAreaView
      // Clip the corner rings so they never widen the page (web) or the scroll area.
      style={{ flex: 1, backgroundColor: colors.ground, overflow: "hidden" }}
    >
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", top: -140, right: -150 }}
      >
        <Svg width={340} height={340} viewBox="0 0 100 100">
          {[0.38, 0.58, 0.78, 0.98].map((r, index) => (
            <Circle
              key={r}
              cx={50}
              cy={50}
              r={r * 49}
              fill="none"
              stroke={colors.sage300}
              strokeOpacity={0.55 - index * 0.12}
              strokeWidth={0.5}
            />
          ))}
        </Svg>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 24,
            gap: 24,
          }}
        >
          <View
            style={{ minHeight: 48, justifyContent: "center", marginLeft: -12 }}
          >
            {onBack ? (
              <IconButton
                icon={ChevronLeft}
                accessibilityLabel="Volver"
                disabled={backDisabled}
                onPress={onBack}
              />
            ) : null}
          </View>
          <Animated.View style={[block(0), { gap: 12 }]}>
            {mascot ? (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.sage100,
                }}
              >
                <Monedin size="sm" />
              </View>
            ) : null}
            <AppText ref={heading} variant="hero" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? (
              <AppText style={{ color: colors.inkMuted }}>{subtitle}</AppText>
            ) : null}
          </Animated.View>
          <Animated.View style={[block(1), { gap: 16 }]}>
            {children}
          </Animated.View>
          {footer ? (
            <Animated.View style={[block(2), { marginTop: "auto", gap: 8 }]}>
              {footer}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
