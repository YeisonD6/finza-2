import { useRef, useState, type ElementRef } from "react";
import { TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "../features/auth/components/AuthShell";
import {
  NewPasswordFields,
  passwordProblem,
} from "../features/auth/components/NewPasswordFields";
import { auth } from "../features/auth/runtime";
import { AppButton } from "../shared/ui/AuthControls";
import { Feedback } from "../shared/ui/Feedback";
import { AppText } from "../shared/ui/AppText";
import { Monedin } from "../shared/brand/Monedin";
import { colors } from "../shared/theme/tokens";
import {
  error as errorHaptic,
  success as successHaptic,
} from "../shared/theme/haptics";
import {
  announce,
  useDeferredFocus,
} from "../shared/accessibility/announcements";

/** Opened from the e-mailed link finza://reset-password?token=… */
export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef<ElementRef<typeof TextInput>>(null);
  const requestFocus = useDeferredFocus(busy);
  const toLogin = () => router.replace("/(auth)/login");

  async function save() {
    const problem = token
      ? passwordProblem(value, confirm)
      : "El enlace está incompleto. Solicita uno nuevo.";
    if (problem) {
      setError(problem);
      void errorHaptic();
      announce(problem);
      requestFocus(() => ref.current?.focus());
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.resetPassword(token as string, value);
      // Every session was revoked by the server, including this device's.
      await auth.clear().catch(() => {});
      setDone(true);
      void successHaptic();
      announce("Contraseña actualizada. Inicia sesión con la nueva.");
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "No se pudo cambiar la contraseña";
      setError(text);
      void errorHaptic();
      announce(text);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <AuthShell
        title="Listo, ya puedes entrar"
        mascot={false}
        onBack={toLogin}
      >
        <Monedin size="md" motion="celebrate" />
        <AppText style={{ color: colors.inkMuted }}>
          Cambiamos tu contraseña y cerramos las sesiones abiertas en otros
          dispositivos.
        </AppText>
        <AppButton title="Iniciar sesión" onPress={toLogin} />
      </AuthShell>
    );

  return (
    <AuthShell
      title="Crea una contraseña nueva"
      subtitle="Al guardarla cerraremos tus sesiones en otros dispositivos."
      onBack={toLogin}
      backDisabled={busy}
    >
      <NewPasswordFields
        ref={ref}
        value={value}
        confirm={confirm}
        onChange={setValue}
        onConfirm={setConfirm}
        disabled={busy}
        onSubmit={save}
      />
      <Feedback message={error} tone="error" announce={false} />
      <AppButton title="Guardar contraseña" onPress={save} busy={busy} />
    </AuthShell>
  );
}
