import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { PiggyBank, Plus, Target } from "lucide-react-native";
import { AppText } from "../../../shared/ui/AppText";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import {
  categoryPalette,
  colors,
  radii,
  shadows,
} from "../../../shared/theme/tokens";

type Action = {
  label: string;
  hint: string;
  icon: LucideIcon;
  primary?: boolean;
  tint?: string;
  ink?: string;
  onPress(): void;
};

/**
 * Three shortcuts that the tab bar does not already cover well: register, budgets
 * and a new goal. Plain buttons with a visible label; no motion beyond press state.
 */
export function QuickActions({
  onRegister,
  onBudgets,
  onNewGoal,
}: {
  onRegister(): void;
  onBudgets(): void;
  onNewGoal(): void;
}) {
  const actions: Action[] = [
    {
      label: "Registrar",
      hint: "Abre el formulario para registrar un gasto o ingreso",
      icon: Plus,
      primary: true,
      onPress: onRegister,
    },
    {
      label: "Presupuestos",
      hint: "Revisa y ajusta tus presupuestos del mes",
      icon: PiggyBank,
      tint: categoryPalette.services.tint,
      ink: categoryPalette.services.ink,
      onPress: onBudgets,
    },
    {
      label: "Nueva meta",
      hint: "Crea una meta de ahorro",
      icon: Target,
      onPress: onNewGoal,
    },
  ];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          paddingVertical: 12,
          paddingHorizontal: 8,
        },
        shadows.card,
      ]}
    >
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.hint}
          onPress={action.onPress}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            gap: 8,
            paddingVertical: 4,
            minHeight: 48,
            borderRadius: radii.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: action.primary
                ? colors.forest700
                : (action.tint ?? colors.sage100),
            }}
          >
            <DecorativeIcon
              icon={action.icon}
              size={22}
              strokeWidth={2}
              color={
                action.primary ? colors.onForest : (action.ink ?? colors.accent)
              }
            />
          </View>
          <AppText variant="label" style={{ textAlign: "center" }}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
