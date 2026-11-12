import { AppButton } from "./AppButton";
import { Banner } from "./Banner";
import { SkeletonList } from "./Skeleton";
import { useThemeRefresh } from "../theme/tokens";
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
  return loading ? <SkeletonList rows={3} /> : null;
}
