import { DecorativeIcon } from "./DecorativeIcon";
import { useState, useRef, type ElementRef } from "react";
import { Pressable, TextInput } from "react-native";
import { AppButton } from "./AppButton";
import { TextField } from "./TextField";
import { announce } from "../accessibility/announcements";
import { error as errorHaptic } from "../theme/haptics";
import { View } from "react-native";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { IconButton } from "./IconButton";
import { AppText } from "./AppText";
import { bogotaToday, validMonth } from "../../features/movements/domain";
import { monthLabel, shiftMonth } from "../formatting/dates";
import { colors } from "../theme/tokens";
export function MonthSwitcher({
  month,
  onChange,
  inverse = false,
  disabled = false,
}: {
  month: string;
  onChange(month: string): void;
  inverse?: boolean;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false),
    [input, setInput] = useState(month),
    [error, setError] = useState("");
  const field = useRef<ElementRef<typeof TextInput>>(null);
  const prev = shiftMonth(month, -1),
    next = shiftMonth(month, 1),
    max = bogotaToday().slice(0, 7);
  const color = inverse ? colors.onForest : colors.accent;
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <IconButton
          icon={ChevronLeft}
          color={color}
          accessibilityLabel={`Mes anterior: ${monthLabel(prev)}`}
          disabled={disabled || month <= "1900-01"}
          onPress={() => {
            if (prev >= "1900-01") onChange(prev);
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mes: ${monthLabel(month)}. Toca para elegir otro mes`}
          accessibilityState={{ expanded, disabled }}
          disabled={disabled}
          onPress={() => {
            setInput(month);
            setError("");
            setExpanded(!expanded);
          }}
          style={{
            minHeight: 48,
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <AppText
            variant="subhead"
            style={{
              color,
              textTransform: "capitalize",
              textAlign: "center",
              flexShrink: 1,
            }}
          >
            {monthLabel(month)}
          </AppText>
          <DecorativeIcon icon={ChevronDown} size={16} color={color} />
        </Pressable>
        <IconButton
          icon={ChevronRight}
          color={color}
          accessibilityLabel={`Mes siguiente: ${monthLabel(next)}`}
          disabled={disabled || month >= max}
          onPress={() => {
            if (next <= max) onChange(next);
          }}
        />
      </View>
      {expanded ? (
        <>
          <TextField
            ref={field}
            label="Mes (YYYY-MM)"
            value={input}
            onChangeText={setInput}
            error={error}
            maxLength={7}
            editable={!disabled}
            autoCorrect={false}
          />
          <AppButton
            title="Aplicar mes"
            disabled={disabled}
            onPress={() => {
              if (!validMonth(input) || input > max) {
                const message =
                  "Ingresa un mes válido YYYY-MM, entre 1900-01 y el mes actual de Bogotá";
                setError(message);
                field.current?.focus();
                announce(message);
                void errorHaptic();
                return;
              }
              setError("");
              onChange(input);
              setExpanded(false);
            }}
          />
        </>
      ) : null}
    </View>
  );
}
