import { useEffect, useRef, type ElementRef, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { MonedinHero } from "../../../shared/brand/MonedinHero";
import { LiquidBackdrop } from "../../../shared/ui/LiquidBackdrop";
import { GlassSurface } from "../../../shared/ui/GlassSurface";
import { AppText } from "../../../shared/ui/AppText";
import { IconButton } from "../../../shared/ui/IconButton";
import { focusAccessibility } from "../../../shared/accessibility/announcements";
import { colors } from "../../../shared/theme/tokens";
import { useEntrance } from "../../../shared/theme/entrance";

/**
 * Shared liquid-glass frame with Monedin above the heading and form.
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
  const heading = useRef<ElementRef<typeof Text>>(null);
  const block = useEntrance(3);
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 740 || fontScale > 1.2;
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
      style={{ flex: 1, backgroundColor: colors.ground, overflow: "hidden" }}
    >
      <LiquidBackdrop />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            maxWidth: 500,
            alignSelf: "center",
            paddingHorizontal: 20,
            paddingBottom: 24,
            gap: compact ? 16 : 20,
          }}
        >
          <View
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {onBack ? (
              <IconButton
                icon={ChevronLeft}
                accessibilityLabel="Volver"
                disabled={backDisabled}
                onPress={onBack}
                style={{
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.surface,
                }}
              />
            ) : null}
            <AppText
              variant="label"
              style={{ color: colors.forest700, letterSpacing: 3 }}
            >
              FINZA
            </AppText>
            <View style={{ width: 48 }} />
          </View>
          <Animated.View style={[block(0), { gap: 8, alignItems: "center" }]}>
            {mascot ? <MonedinHero compact={compact} /> : null}
            <AppText
              ref={heading}
              variant="hero"
              accessibilityRole="header"
              style={{ textAlign: "center", color: colors.forest950 }}
            >
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                style={{
                  color: colors.inkMuted,
                  textAlign: "center",
                  maxWidth: 340,
                }}
              >
                {subtitle}
              </AppText>
            ) : null}
          </Animated.View>
          <Animated.View style={block(1)}>
            <GlassSurface style={{ padding: 20, gap: 16, borderRadius: 28 }}>
              {children}
            </GlassSurface>
          </Animated.View>
          {footer ? (
            <Animated.View style={[block(2), { gap: 8 }]}>
              {footer}
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
