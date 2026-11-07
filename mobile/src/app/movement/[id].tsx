import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
import { movementsApi } from "../../features/movements/api";
import { MovementModal } from "../../features/movements/components/MovementModal";
import { Screen } from "../../shared/ui/Screen";
import { Banner } from "../../shared/ui/Banner";
import { AppButton } from "../../shared/ui/AppButton";
export default function EditMovement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useSelector((s: RootState) => s.auth.profile);
  const query = movementsApi.endpoints.movement.useQuery(id, {
    skip: !profile || !id,
  });
  if (!profile) return <Redirect href="/(auth)/login" />;
  if (query.currentData && !query.isError)
    return <MovementModal initial={query.currentData} />;
  return (
    <Screen
      title="Editar movimiento"
      variant="modal"
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)/movements");
      }}
      backLabel="Cerrar sin guardar"
    >
      <Banner
        message={
          query.isError
            ? "No se pudo cargar el movimiento. Puede haberse archivado o no estar disponible."
            : "Cargando…"
        }
        tone={query.isError ? "error" : "status"}
      />
      {query.isError ? (
        <AppButton
          title="Reintentar"
          onPress={() => {
            void query.refetch();
          }}
        />
      ) : null}
    </Screen>
  );
}
