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
import { focusAccessibility } from "../accessibility/announcements";
import { AppButton } from "./AppButton";
import { styles } from "./styles";

export function Screen({
  title,
  children,
  scroll = true,
  onBack,
  backLabel = "Volver",
  backDisabled = false,
  focusKey = "",
}: {
  title: string;
  children: ReactNode | ((heading: ReactNode) => ReactNode);
  scroll?: boolean;
  onBack?(): void;
  backLabel?: string;
  backDisabled?: boolean;
  focusKey?: string;
}) {
  const heading = useRef<ElementRef<typeof Text>>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      focusAccessibility(heading.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [title, focusKey]);
  useEffect(() => {
    if (!onBack) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!backDisabled) onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack, backDisabled]);
  const header = (
    <>
      <Text ref={heading} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {onBack ? (
        <AppButton title={backLabel} onPress={onBack} disabled={backDisabled} />
      ) : null}
    </>
  );
  return (
    <SafeAreaView style={styles.screen}>
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
            <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 12 }}>
              {header}
            </View>
            {children}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
