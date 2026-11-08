import { ActivityIndicator } from "react-native";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { Banner } from "./Banner";
import { colors, useThemeRefresh } from "../theme/tokens";
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: boolean;
  retry(): void;
}) {
  useThemeRefresh();
  if (error)
    return (
      <>
        <Banner
          message="No se pudo cargar. Revisa tu conexión y reintenta."
          tone="error"
        />
        <AppButton title="Reintentar" onPress={retry} />
      </>
    );
  return loading ? (
    <>
      <ActivityIndicator color={colors.accent} />
      <AppText>Cargando…</AppText>
    </>
  ) : null;
}
