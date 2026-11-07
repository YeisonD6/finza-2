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
import { Monedin } from "../../../shared/brand/Monedin";
import { AppText } from "../../../shared/ui/AppText";
import { IconButton } from "../../../shared/ui/IconButton";
import { focusAccessibility } from "../../../shared/accessibility/announcements";
import { colors } from "../../../shared/theme/tokens";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
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
            {mascot ? <Monedin size="sm" /> : null}
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
