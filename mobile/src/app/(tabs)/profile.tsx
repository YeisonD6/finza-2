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
  const active = useIsFocused();
  const profile = useSelector((s: RootState) => s.auth.profile);
  const query = useMeQuery(undefined, { skip: !profile });
  const session = useSession();
  return (
    <Screen title="Perfil" active={active}>
      <Card>
        <AppText variant="heading">Tu cuenta</AppText>
        <AppText>{query.currentData?.email ?? profile?.email}</AppText>
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
      <Card>
        <AppText variant="heading">Privacidad y seguridad</AppText>
        <AppText>
          Tus movimientos y categorías se guardan en el servidor de FINZA y
          están asociados a tu cuenta. La caché financiera del teléfono se borra
          al cerrar sesión.
        </AppText>
        <AppText>
          Tu contraseña se protege con Argon2id. El acceso vive en memoria y la
          renovación de sesión se guarda en el almacenamiento seguro del
          dispositivo. Las sesiones caducan. Sin anuncios ni analítica de
          terceros.
        </AppText>
      </Card>
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
