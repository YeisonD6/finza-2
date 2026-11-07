import { Children, Fragment, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { AppText } from "./AppText";
import { DecorativeIcon } from "./DecorativeIcon";
import { colors, radii, shadows, type CategoryTone } from "../theme/tokens";

/** One tappable settings line: icon tile, title, optional detail, chevron. */
export function SettingsRow({
  icon,
  title,
  detail,
  tone = "default",
  hint,
  palette,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  tone?: "default" | "danger";
  hint?: string;
  /** Icon tile colours; each row gets its own hue so the list scans faster. */
  palette?: CategoryTone;
  onPress(): void;
}) {
  const danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        paddingVertical: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger
            ? colors.expenseTint
            : (palette?.tint ?? colors.sage100),
        }}
      >
        <DecorativeIcon
          icon={icon}
          size={20}
          strokeWidth={1.75}
          color={danger ? colors.danger : (palette?.ink ?? colors.forest700)}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          variant="subhead"
          style={danger ? { color: colors.danger } : undefined}
        >
          {title}
        </AppText>
        {detail ? (
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      <DecorativeIcon icon={ChevronRight} size={20} color={colors.inkSubtle} />
    </Pressable>
  );
}

/** A titled white group of settings rows separated by hairlines. */
export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      <AppText
        variant="label"
        accessibilityRole="header"
        style={{ color: colors.inkMuted, paddingHorizontal: 4 }}
      >
        {title}
      </AppText>
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            paddingHorizontal: 16,
          },
          shadows.card,
        ]}
      >
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index ? (
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginLeft: 48,
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
