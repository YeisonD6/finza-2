import { ProfileInformation } from "../../features/auth/components/ProfileInformation";
import Constants from "expo-constants";
import { useState } from "react";
import { storage } from "../../features/auth/storage";
import { useIsFocused } from "expo-router";
import { useSelector } from "react-redux";
import { router } from "expo-router";
import type { RootState } from "../../core/store";
import { useMeQuery } from "../../shared/api/baseApi";
import { useSession } from "../../features/auth/SessionProvider";
import { Screen } from "../../shared/ui/Screen";
import { Card } from "../../shared/ui/Card";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Banner } from "../../shared/ui/Banner";
import { View } from "react-native";
import {
  Accessibility,
  KeyRound,
  PiggyBank,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Trash2,
  LayoutGrid,
} from "lucide-react-native";
import { SettingsGroup, SettingsRow } from "../../shared/ui/SettingsRow";
import { categoryPalette, colors } from "../../shared/theme/tokens";

const PROVIDER_NAMES: Record<string, string> = {
  google: "Google",
  apple: "Apple",
};
export default function Profile() {
  const [welcomeError, setWelcomeError] = useState("");
  const [information, setInformation] = useState<
    "privacy" | "accessibility" | null
  >(null);
  const active = useIsFocused();
  const profile = useSelector((s: RootState) => s.auth.profile);
  const query = useMeQuery(undefined, { skip: !profile });
  const session = useSession();
  const email = query.currentData?.email ?? profile?.email ?? "";
  const hasPassword = profile?.has_password !== false;
  const methods = [
    ...(hasPassword ? ["correo y contraseña"] : []),
    ...(profile?.providers ?? []).map((p) => PROVIDER_NAMES[p] ?? p),
  ];
  const signIn = `Entras con ${methods.join(", ").replace(/, ([^,]*)$/, " y $1")}`;
  if (information)
    return (
      <ProfileInformation
        section={information}
        active={active}
        onBack={() => setInformation(null)}
      />
    );
  return (
    <Screen title="Perfil" active={active}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.sage300,
            }}
          >
            <AppText variant="heading" style={{ color: colors.forest900 }}>
              {(email[0] ?? "?").toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="subhead">{email}</AppText>
            <AppText variant="caption" style={{ color: colors.inkMuted }}>
              {signIn}
            </AppText>
            <AppText
              variant="caption"
              style={{
                color:
                  profile?.email_verified === false
                    ? colors.warning
                    : colors.forest600,
              }}
            >
              {profile?.email_verified === false
                ? "Correo sin confirmar"
                : "Correo confirmado"}
              {" · "}Moneda COP
            </AppText>
          </View>
        </View>
        {query.isError ? (
          <>
            <Banner message="No se pudo actualizar tu perfil." tone="error" />
            <AppButton
              title="Reintentar perfil"
              onPress={() => {
                void query.refetch();
              }}
            />
          </>
        ) : null}
      </Card>
      <SettingsGroup title="Tu dinero">
        <SettingsRow
          icon={PiggyBank}
          title="Presupuestos"
          palette={categoryPalette.services}
          detail="Límites por categoría para este mes"
          onPress={() => router.push("/budgets")}
        />
        <SettingsRow
          icon={Sprout}
          title="Metas de ahorro"
          palette={categoryPalette.salary}
          detail="Lo que estás construyendo"
          onPress={() => router.navigate("/(tabs)/goals")}
        />
      </SettingsGroup>
      <SettingsGroup title="Seguridad">
        <SettingsRow
          icon={KeyRound}
          title={hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          palette={categoryPalette.transport}
          detail={
            hasPassword
              ? "Cierra tus otras sesiones"
              : "Para entrar también con tu correo"
          }
          onPress={() => router.push("/security/password")}
        />
        <SettingsRow
          icon={ShieldCheck}
          title="Privacidad y seguridad"
          palette={categoryPalette.income}
          onPress={() => setInformation("privacy")}
        />
      </SettingsGroup>
      <SettingsGroup title="Preferencias">
        <SettingsRow
          icon={LayoutGrid}
          title="Widgets"
          palette={categoryPalette.other}
          detail="Tu mes en la pantalla de inicio"
          onPress={() => router.push("/widgets")}
        />
        <SettingsRow
          icon={Accessibility}
          title="Accesibilidad"
          palette={categoryPalette.transport}
          onPress={() => setInformation("accessibility")}
        />
        <SettingsRow
          icon={RotateCcw}
          title="Volver a ver la bienvenida"
          palette={categoryPalette.food}
          onPress={() => {
            void storage
              .remove("finza.onboarded")
              .then(() => router.push("/(auth)/onboarding"))
              .catch(() =>
                setWelcomeError(
                  "No se pudo reiniciar la bienvenida. Reintenta.",
                ),
              );
          }}
        />
      </SettingsGroup>
      <Banner message={welcomeError} tone="error" />
      <AppButton
        title="Cerrar sesión"
        variant="secondary"
        busy={session.busy}
        onPress={() => {
          void session.logout().then(() => router.replace("/(auth)/login"));
        }}
      />
      <SettingsGroup title="Zona de riesgo">
        <SettingsRow
          icon={Trash2}
          title="Eliminar cuenta"
          detail="Borra tu cuenta y todos tus datos"
          tone="danger"
          onPress={() => router.push("/security/delete-account")}
        />
      </SettingsGroup>
      <AppText
        variant="caption"
        style={{ color: colors.inkMuted, textAlign: "center" }}
      >
        FINZA · Versión{" "}
        {Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0"}
      </AppText>
    </Screen>
  );
}
