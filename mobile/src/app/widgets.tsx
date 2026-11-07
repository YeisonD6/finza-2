import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, Switch, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ListPlus, PiggyBank, WalletCards } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { AuthShell } from "../features/auth/components/AuthShell";
import {
  getHideAmounts,
  setHideAmounts,
  widgetsAvailable,
} from "../features/widgets/native";
import { AppText } from "../shared/ui/AppText";
import { Banner } from "../shared/ui/Banner";
import { DecorativeIcon } from "../shared/ui/DecorativeIcon";
import { PrivateScreen } from "../shared/ui/PrivateScreen";
import {
  categoryPalette,
  colors,
  radii,
  shadows,
  type CategoryTone,
} from "../shared/theme/tokens";
import { WidgetPreview } from "../features/widgets/WidgetPreview";
import { announce } from "../shared/accessibility/announcements";

const WIDGETS: {
  icon: LucideIcon;
  title: string;
  detail: string;
  palette: CategoryTone;
}[] = [
  {
    icon: WalletCards,
    palette: categoryPalette.salary,
    title: "Resumen del mes",
    detail: "Balance, ingresos y gastos del mes en curso.",
  },
  {
    icon: PiggyBank,
    palette: categoryPalette.services,
    title: "Presupuesto",
    detail: "El presupuesto más cerca de su límite.",
  },
  {
    icon: ListPlus,
    palette: categoryPalette.transport,
    title: "Atajos",
    detail: "Registra un gasto o un ingreso en un toque.",
  },
];

const HOW_TO =
  Platform.OS === "ios"
    ? "Mantén presionada tu pantalla de inicio, toca Editar › Añadir widget y busca FINZA."
    : "Mantén presionado un espacio vacío de tu pantalla de inicio, toca Widgets y busca FINZA.";

function Section({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: 16,
          gap: 12,
        },
        shadows.card,
      ]}
    >
      {children}
    </View>
  );
}

export default function Widgets() {
  const [hidden, setHidden] = useState(getHideAmounts);
  // The widget's eye button can change the setting while this screen is open.
  useFocusEffect(useCallback(() => setHidden(getHideAmounts()), []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setHidden(getHideAmounts());
    });
    return () => subscription.remove();
  }, []);
  return (
    <PrivateScreen>
      <AuthShell
        title="Widgets"
        subtitle="Mira cómo va tu mes sin abrir la app."
        mascot={false}
        onBack={() => router.back()}
      >
        {widgetsAvailable ? null : (
          <Banner
            tone="status"
            message="Los widgets funcionan en la app instalada en Android o iOS. En esta vista previa no están disponibles."
          />
        )}
        <WidgetPreview hidden={hidden} />
        <Section>
          {WIDGETS.map((widget) => (
            <View
              key={widget.title}
              accessible
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: widget.palette.tint,
                }}
              >
                <DecorativeIcon
                  icon={widget.icon}
                  size={20}
                  strokeWidth={1.75}
                  color={widget.palette.ink}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="subhead">{widget.title}</AppText>
                <AppText variant="caption" style={{ color: colors.inkMuted }}>
                  {widget.detail}
                </AppText>
              </View>
            </View>
          ))}
          <AppText style={{ color: colors.inkMuted }}>{HOW_TO}</AppText>
        </Section>
        <Section>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="subhead">Ocultar montos</AppText>
              <AppText variant="caption" style={{ color: colors.inkMuted }}>
                Los widgets muestran •••• en lugar de cifras. También puedes
                tocar el ojo del widget de resumen.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Ocultar montos en los widgets"
              value={hidden}
              disabled={!widgetsAvailable}
              accessibilityState={{
                disabled: !widgetsAvailable,
                checked: hidden,
              }}
              onValueChange={(value) => {
                setHidden(value);
                setHideAmounts(value);
                announce(
                  value
                    ? "Los widgets ocultan tus montos"
                    : "Los widgets muestran tus montos",
                );
              }}
              trackColor={{
                false: colors.borderStrong,
                true: colors.forest700,
              }}
              thumbColor={colors.surface}
              {...({ activeThumbColor: colors.surface } as object)}
            />
          </View>
        </Section>
        <AppText variant="caption" style={{ color: colors.inkMuted }}>
          Los widgets solo guardan en tu teléfono los totales del mes y un
          presupuesto. No guardan tu correo, tu contraseña ni tu sesión, y se
          vacían al cerrar sesión. Se actualizan cada vez que abres FINZA o
          registras un movimiento.
        </AppText>
      </AuthShell>
    </PrivateScreen>
  );
}
