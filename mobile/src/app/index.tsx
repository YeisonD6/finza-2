import { useEffect, useState } from "react";
import { Text, ScrollView, AccessibilityInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import type { RootState } from "../core/store";
import { auth } from "../features/auth/runtime";
import { AuthScreen } from "../features/auth/AuthScreen";
import { AppButton, styles } from "../shared/ui/AuthControls";
import { useMeQuery } from "../shared/api/baseApi";

export default function FoundationScreen() {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error, refetch } = useMeQuery(undefined, { skip: !profile });
  async function restore() {
    try {
      setMessage("");
      await auth.restore();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo recuperar la sesión",
      );
    }
  }
  useEffect(() => {
    void restore();
  }, []);
  if (loading)
    return (
      <SafeAreaView style={styles.screen}>
        <Text accessibilityRole="header" style={styles.title}>
          Recuperando sesión…
        </Text>
      </SafeAreaView>
    );
  if (!profile)
    return (
      <>
        {message ? (
          <SafeAreaView>
            <Text accessibilityRole="alert">{message}</Text>
            <AppButton title="Reintentar sesión" onPress={restore} />
          </SafeAreaView>
        ) : null}
        <AuthScreen />
      </>
    );
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Tu cuenta Finza
        </Text>
        <Text style={styles.label}>{data?.email ?? profile.email}</Text>
        <Text style={styles.label}>Moneda: pesos colombianos (COP)</Text>
        <Text style={styles.label}>
          Sesión iniciada. Los movimientos y el dashboard se incorporarán en la
          siguiente fase.
        </Text>
        {error ? (
          <>
            <Text accessibilityRole="alert">
              No se pudo actualizar tu perfil.
            </Text>
            <AppButton
              title="Reintentar"
              onPress={() => {
                void refetch();
              }}
            />
          </>
        ) : null}
        <AppButton
          title="Cerrar sesión"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await auth.logout();
              AccessibilityInfo.announceForAccessibility("Sesión cerrada");
            } catch {
              setMessage(
                "Sesión cerrada localmente. No se pudo confirmar la revocación remota o el almacenamiento seguro; reintenta con conexión.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
