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
export default function Profile() {
  const [welcomeError, setWelcomeError] = useState("");
  const [information, setInformation] = useState<
    "privacy" | "accessibility" | null
  >(null);
  const active = useIsFocused();
  const profile = useSelector((s: RootState) => s.auth.profile);
  const query = useMeQuery(undefined, { skip: !profile });
  const session = useSession();
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
        <AppText variant="heading">Tu cuenta</AppText>
        <AppText>{query.currentData?.email ?? profile?.email}</AppText>
        <AppText>Moneda: COP · Pesos colombianos</AppText>
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
      <AppButton
        title="Presupuestos"
        variant="secondary"
        onPress={() => router.push("/budgets")}
      />
      <AppButton
        title="Privacidad y seguridad"
        variant="ghost"
        onPress={() => setInformation("privacy")}
      />
      <AppButton
        title="Accesibilidad"
        variant="ghost"
        onPress={() => setInformation("accessibility")}
      />
      <AppButton
        title="Volver a ver la bienvenida"
        variant="ghost"
        onPress={() => {
          void storage
            .remove("finza.onboarded")
            .then(() => router.push("/(auth)/welcome"))
            .catch(() =>
              setWelcomeError("No se pudo reiniciar la bienvenida. Reintenta."),
            );
        }}
      />
      <Banner message={welcomeError} tone="error" />
      <AppText variant="caption">
        Versión{" "}
        {Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "0.1.0"}
      </AppText>
      <AppButton
        title="Cerrar sesión"
        variant="danger"
        busy={session.busy}
        onPress={() => {
          void session.logout().then(() => router.replace("/(auth)/login"));
        }}
      />
    </Screen>
  );
}
