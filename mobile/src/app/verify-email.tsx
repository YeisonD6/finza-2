import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import type { RootState } from "../core/store";
import { AuthShell } from "../features/auth/components/AuthShell";
import { auth } from "../features/auth/runtime";
import { AppButton } from "../shared/ui/AuthControls";
import { AppText } from "../shared/ui/AppText";
import { Feedback } from "../shared/ui/Feedback";
import { Monedin } from "../shared/brand/Monedin";
import { colors } from "../shared/theme/tokens";
import {
  error as errorHaptic,
  success as successHaptic,
} from "../shared/theme/haptics";
import { announce } from "../shared/accessibility/announcements";

type State = "working" | "done" | "failed";

/** Opened from the e-mailed link finza://verify-email?token=… */
export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const signedIn = useSelector((s: RootState) => Boolean(s.auth.profile));
  const [state, setState] = useState<State>("working");
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setState("failed");
      setError("El enlace está incompleto. Pide uno nuevo desde FINZA.");
      return;
    }
    auth
      .verifyEmail(token)
      .then(() => {
        setState("done");
        void successHaptic();
        announce("Correo confirmado");
      })
      .catch((e: unknown) => {
        const text =
          e instanceof Error ? e.message : "No pudimos confirmar tu correo";
        setState("failed");
        setError(text);
        void errorHaptic();
      });
  }, [token]);

  const next = () => router.replace(signedIn ? "/(tabs)" : "/(auth)/login");
  const nextLabel = signedIn ? "Ir al inicio" : "Iniciar sesión";

  if (state === "working")
    return (
      <AuthShell title="Confirmando tu correo" mascot={false}>
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </AuthShell>
    );

  if (state === "done")
    return (
      <AuthShell title="Correo confirmado" mascot={false}>
        <Monedin size="md" motion="celebrate" />
        <AppText style={{ color: colors.inkMuted }}>
          Gracias. Ahora podemos ayudarte a recuperar tu cuenta si alguna vez
          olvidas la contraseña.
        </AppText>
        <AppButton title={nextLabel} onPress={next} />
      </AuthShell>
    );

  return (
    <AuthShell title="No pudimos confirmarlo" mascot={false}>
      <Feedback message={error} tone="error" />
      <AppText style={{ color: colors.inkMuted }}>
        {signedIn
          ? "Puedes pedir un enlace nuevo desde el aviso en Inicio."
          : "Inicia sesión y pide un enlace nuevo desde el aviso en Inicio."}
      </AppText>
      <AppButton title={nextLabel} onPress={next} />
    </AuthShell>
  );
}
