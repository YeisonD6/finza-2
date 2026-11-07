import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { TextInput } from "react-native";
import { TextField } from "./TextField";
import { AmountInput } from "./AmountInput";
import { AppText } from "./AppText";
import { typography, colors } from "../theme/tokens";
import { fontFamily } from "../theme/fonts";
export const AmountField = forwardRef<
  ElementRef<typeof TextInput>,
  ComponentProps<typeof AmountInput>
>(function AmountField(props, ref) {
  return (
    <TextField
      keyboardType="decimal-pad"
      maxLength={32}
      {...props}
      ref={ref}
      label="Monto"
      accessibilityLabel="Monto"
      accessibilityHint="Monto en pesos colombianos (COP). Mayor que cero. Usa coma o punto decimal, sin separadores de miles."
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
