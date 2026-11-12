import {
  forwardRef,
  useState,
  type ElementRef,
  type ComponentProps,
} from "react";
import { Text, TextInput, View } from "react-native";
import { TextField } from "./TextField";
import { AmountInput } from "./AmountInput";
import { AppText } from "./AppText";
import { typography, colors, useThemeRefresh } from "../theme/tokens";
import { fontFamily } from "../theme/fonts";
const amountHint =
  "Monto en pesos colombianos (COP). Mayor que cero. Usa coma o punto decimal, sin separadores de miles.";
export const AmountField = forwardRef<
  ElementRef<typeof TextInput>,
  ComponentProps<typeof AmountInput> & {
    /**
     * Registrar's protagonist: a large light figure with a small «$», no box and no
     * visible hint (the spoken hint keeps the format rules).
     */
    hero?: boolean;
  }
>(function AmountField({ hero = false, ...props }, ref) {
  useThemeRefresh();
  // A text input does not size to its content, so a hidden twin measures the figure.
  const [width, setWidth] = useState(48);
  const heroText = {
    fontFamily: fontFamily.amount,
    fontSize: 60,
    letterSpacing: typography.amount.letterSpacing,
    fontVariant: ["tabular-nums" as const],
  };
  if (hero)
    return (
      <View>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", opacity: 0, left: 0, top: 0 }}
        >
          <Text
            allowFontScaling
            numberOfLines={1}
            style={heroText}
            onLayout={(event) =>
              setWidth(Math.ceil(event.nativeEvent.layout.width) + 12)
            }
          >
            {props.value || "0"}
          </Text>
        </View>
        <TextField
          keyboardType="decimal-pad"
          maxLength={32}
          {...props}
          ref={ref}
          label="Monto"
          centeredLabel
          accessibilityLabel="Monto"
          accessibilityHint={`${amountHint} Usa coma para decimales.`}
          placeholder="0"
          placeholderTextColor={colors.inkSubtle}
          inputContainerStyle={{
            borderWidth: 0,
            // Only an error draws a line, so the field is never silently invalid.
            borderBottomWidth: props.error ? 2 : 0,
            borderRadius: 0,
            backgroundColor: colors.transparent,
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 4,
          }}
          leading={
            <AppText
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                color: colors.inkMuted,
                fontFamily: fontFamily.amount,
                fontSize: 28,
                lineHeight: 36,
                paddingTop: 10,
              }}
            >
              $
            </AppText>
          }
          style={[
            typography.amount,
            heroText,
            {
              lineHeight: 72,
              textAlign: "center",
              color: colors.ink,
              flex: 0,
              flexGrow: 0,
              flexShrink: 1,
              width,
              maxWidth: "88%",
              paddingHorizontal: 0,
              paddingVertical: 0,
              minHeight: 72,
            },
            props.style,
          ]}
        />
      </View>
    );
  return (
    <TextField
      keyboardType="decimal-pad"
      maxLength={32}
      {...props}
      ref={ref}
      label="Monto"
      accessibilityLabel="Monto"
      accessibilityHint={amountHint}
      hint="Usa coma para decimales."
      placeholder="0"
      inputContainerStyle={{
        borderWidth: 0,
        borderBottomWidth: 2,
        borderRadius: 0,
        backgroundColor: colors.transparent,
        justifyContent: "center",
        gap: 8,
      }}
      trailing={
        <AppText
          variant="label"
          style={{ color: colors.inkMuted, paddingTop: 12 }}
        >
          COP
        </AppText>
      }
      style={[
        typography.display,
        {
          fontFamily: fontFamily.display,
          textAlign: "center",
          fontVariant: ["tabular-nums"],
          // Size to the typed amount so «COP» sits right after it, not at the edge.
          flex: 0,
          flexGrow: 0,
          flexShrink: 1,
          minWidth: 64,
          paddingHorizontal: 0,
        },
        props.style,
      ]}
    />
  );
});
