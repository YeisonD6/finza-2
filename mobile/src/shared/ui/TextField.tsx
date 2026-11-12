import {
  forwardRef,
  useId,
  useState,
  type ElementRef,
  type ReactNode,
} from "react";
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { styles } from "./styles";
import { AppText } from "./AppText";
import { colors, useThemeRefresh } from "../theme/tokens";

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  /** Centres the visible label (the large amount field). */
  centeredLabel?: boolean;
  inputContainerStyle?: StyleProp<ViewStyle>;
};
export const TextField = forwardRef<
  ElementRef<typeof TextInput>,
  TextFieldProps
>(function TextField(
  {
    label,
    error,
    hint,
    trailing,
    leading,
    centeredLabel = false,
    inputContainerStyle,
    accessibilityHint,
    accessibilityState,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  useThemeRefresh();
  const id = useId();
  const [focused, setFocused] = useState(false);
  const labelId = `field-${id}-label`;
  return (
    <View style={{ gap: 8, flexShrink: 0 }}>
      <Text
        allowFontScaling
        nativeID={labelId}
        style={[
          styles.label,
          centeredLabel && { textAlign: "center", color: colors.inkMuted },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.input,
          { padding: 0, flexDirection: "row", alignItems: "center" },
          focused && styles.inputFocused,
          error && styles.inputError,
          inputContainerStyle,
        ]}
      >
        {leading}
        <TextInput
          {...props}
          allowFontScaling
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          editable={
            props.editable !== false && accessibilityState?.disabled !== true
          }
          accessibilityLabelledBy={labelId}
          accessibilityHint={
            [hint, accessibilityHint, error ? `Error: ${error}` : undefined]
              .filter(Boolean)
              .map((part) => part?.replace(/\.+$/, ""))
              .join(". ") || undefined
          }
          accessibilityState={{
            ...accessibilityState,
            disabled:
              props.editable === false || accessibilityState?.disabled === true,
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              flex: 1,
              minWidth: 0,
              borderWidth: 0,
              backgroundColor: colors.transparent,
            },
            style,
          ]}
        />
        {trailing}
      </View>
      {hint ? (
        <AppText variant="caption" style={{ color: colors.inkMuted }}>
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <Text
          allowFontScaling
          nativeID={`field-${id}-error`}
          accessibilityRole="alert"
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
});
