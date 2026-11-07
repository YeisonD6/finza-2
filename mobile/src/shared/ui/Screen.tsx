import { useEffect, useRef, type ElementRef, type ReactNode } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { focusAccessibility } from "../accessibility/announcements";
import { AppButton } from "./AppButton";
import { IconButton } from "./IconButton";
import { AppText, type TextVariant } from "./AppText";
import { styles } from "./styles";
import { fontFamily } from "../theme/fonts";
import { colors } from "../theme/tokens";
export function Screen({
  title,
  children,
  scroll = true,
  onBack,
  backLabel = "Volver",
  backDisabled = false,
  focusKey = "",
  variant = "simple",
  footer,
  active = true,
  showBackAction = true,
  headerLeading,
  titleVariant = "title",
}: {
  title: string;
  titleVariant?: TextVariant;
  headerLeading?: ReactNode;
  children: ReactNode | ((heading: ReactNode) => ReactNode);
  scroll?: boolean;
  onBack?(): void;
  backLabel?: string;
  backDisabled?: boolean;
  focusKey?: string;
  variant?: "simple" | "forest" | "modal";
  footer?: ReactNode;
  active?: boolean;
  showBackAction?: boolean;
}) {
  const heading = useRef<ElementRef<typeof Text>>(null);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() =>
      focusAccessibility(heading.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [title, focusKey, active]);
  useEffect(() => {
    if (!onBack || Platform.OS === "web" || !active) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!backDisabled) onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack, backDisabled, active]);
  const header = (
    <View
      style={[
        { gap: 12 },
        variant === "modal" && { flexDirection: "row", alignItems: "center" },
      ]}
    >
      {onBack && showBackAction && variant === "modal" ? (
        <IconButton
          icon={X}
          accessibilityLabel={backLabel}
          disabled={backDisabled}
          onPress={onBack}
        />
      ) : null}
      {headerLeading}
      {title ? (
        <AppText
          ref={heading}
          accessibilityRole="header"
          variant={titleVariant}
          style={
            variant === "forest"
              ? {
                  color: colors.onForest,
                  letterSpacing: 1,
                  fontFamily: fontFamily.heading,
                  fontWeight: "700",
                }
              : undefined
          }
        >
          {title}
        </AppText>
      ) : null}
      {onBack && showBackAction && variant !== "modal" ? (
        <AppButton
          title={backLabel}
          variant="ghost"
          onPress={onBack}
          disabled={backDisabled}
        />
      ) : null}
    </View>
  );
  return (
    <SafeAreaView
      edges={[
        "top",
        "left",
        "right",
        ...(variant === "modal" ? ["bottom" as const] : []),
      ]}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {typeof children === "function" ? (
          children(header)
        ) : scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {header}
            {children}
          </ScrollView>
        ) : (
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
              {header}
            </View>
            {children}
          </>
        )}
        {footer ? (
          <View
            style={{
              padding: 16,
              gap: 8,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
