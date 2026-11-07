import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { Movement } from "../../features/movements/types";
import { AppText } from "./AppText";
import { AmountText } from "./AmountText";
import { categoryIcon } from "./categoryIcon";
import { amountLabel } from "../formatting/money";
import { dayLabel } from "../formatting/dates";
import { colors, radii } from "../theme/tokens";
export function MovementRow({
  movement,
  category = "Categoría",
  isSystem = true,
  onPress,
  onArchive,
  index = 0,
  disabled = false,
}: {
  movement: Movement;
  category?: string;
  isSystem?: boolean;
  onPress?(): void;
  onArchive?(): void;
  index?: number;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const { fontScale, width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(windowWidth - 40);
  // Reserve the whole amount; large text and long values move to their own row.
  const stacked =
    fontScale >= 1.5 ||
    (width > 0 && (movement.amount.length * 11 + 110) * fontScale > width - 60);
  const Icon = categoryIcon(category, isSystem);
  const label = `${onPress ? "Editar " : ""}${amountLabel(movement.amount, movement.type)}. ${category}. ${movement.occurred_on}. ${movement.note ?? ""}. Movimiento ${index + 1}`;
  const content = (
    <>
      <View
        style={{
          backgroundColor: colors.sage100,
          borderRadius: radii.md,
          padding: 12,
        }}
      >
        <Icon
          size={24}
          strokeWidth={1.75}
          color={colors.forest700}
          accessible={false}
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: stacked ? "column" : "row",
            alignItems: stacked ? "flex-start" : "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <AppText
            variant="subhead"
            style={stacked ? { alignSelf: "stretch" } : { flex: 1 }}
          >
            {category}
          </AppText>
          {stacked ? (
            <ScrollView
              horizontal
              style={{ alignSelf: "stretch", flexGrow: 0 }}
            >
              <AmountText
                value={movement.amount}
                tone={movement.type}
                variant="subhead"
                style={{ flexShrink: 0, textAlign: "left" }}
              />
            </ScrollView>
          ) : (
            <AmountText
              value={movement.amount}
              tone={movement.type}
              variant="subhead"
              style={{ flexShrink: 0, textAlign: stacked ? "left" : "right" }}
            />
          )}
        </View>
        {movement.note ? (
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            {movement.note}
          </AppText>
        ) : null}
        <AppText variant="caption" style={{ color: colors.inkMuted }}>
          {dayLabel(movement.occurred_on)}
        </AppText>
      </View>
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  };
  return onPress ? (
    <Pressable
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityActions={
        onArchive ? [{ name: "archive", label: "Archivar" }] : undefined
      }
      onAccessibilityAction={(event) => {
        if (!disabled && event.nativeEvent.actionName === "archive")
          onArchive?.();
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        { opacity: pressed ? 0.7 : 1 },
        focused && { borderColor: colors.forest700, borderWidth: 2 },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={label}
      style={style}
    >
      {content}
    </View>
  );
}
