import { View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useDashboardQuery } from "../dashboard/api";
import { bogotaToday } from "../movements/domain";
import { AppText } from "../../shared/ui/AppText";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { Monedin } from "../../shared/brand/Monedin";
import { formatCOP } from "../../shared/formatting/money";
import { monthName } from "../../shared/formatting/dates";
import { colors, radii, shadows } from "../../shared/theme/tokens";

const HIDDEN = "••••••";

/**
 * In-app picture of the «Resumen del mes» widget with this month's figures, so people
 * know what they are adding before they open the home-screen picker. It mirrors the
 * native layout (forest card, net, income and expense, Monedin) and the privacy setting.
 */
export function WidgetPreview({ hidden }: { hidden: boolean }) {
  const month = bogotaToday().slice(0, 7);
  const query = useDashboardQuery(month);
  const data = query.isError ? undefined : query.currentData;
  if (!data) return null;
  const zero = /^-?0*(\.0+)?$/.test(data.net);
  const net =
    data.net.startsWith("-") || zero
      ? formatCOP(data.net.replace(/^-(?=0*(\.0+)?$)/, ""))
      : `+${formatCOP(data.net)}`;
  const show = (value: string) => (hidden ? HIDDEN : value);
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" style={{ color: colors.inkMuted }}>
        Vista previa
      </AppText>
      <View
        accessible
        accessibilityLabel={`Vista previa del widget Resumen del mes${hidden ? ", con montos ocultos" : ""}`}
        style={[
          {
            backgroundColor: colors.forest700,
            borderRadius: radii.lg,
            padding: 16,
            flexDirection: "row",
            gap: 12,
            overflow: "hidden",
          },
          shadows.floating,
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText
              variant="caption"
              style={{ color: colors.onForestMuted, flex: 1 }}
            >
              Balance de {monthName(month)}
            </AppText>
            <DecorativeIcon
              icon={hidden ? Eye : EyeOff}
              size={16}
              color={colors.onForestMuted}
            />
          </View>
          <AppText
            variant="title"
            style={{
              color:
                data.net.startsWith("-") && !hidden
                  ? colors.cheek
                  : colors.onForest,
              fontVariant: ["tabular-nums"],
            }}
          >
            {show(net)}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {[
              ["Ingresos", data.income],
              ["Gastos", data.expense],
            ].map(([name, value]) => (
              <View key={name} style={{ gap: 0 }}>
                <AppText
                  variant="caption"
                  style={{ color: colors.onForestMuted }}
                >
                  {name}
                </AppText>
                <AppText
                  variant="label"
                  style={{
                    color: colors.onForest,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {show(formatCOP(value))}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={{ justifyContent: "flex-end" }}>
          <Monedin size="sm" />
        </View>
      </View>
    </View>
  );
}
