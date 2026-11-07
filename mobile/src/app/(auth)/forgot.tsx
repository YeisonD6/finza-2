import { useEffect, useRef, useState, type ElementRef } from "react";
import { TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthShell } from "../../features/auth/components/AuthShell";
import { auth } from "../../features/auth/runtime";
import { AppButton, FormField } from "../../shared/ui/AuthControls";
import { AppText } from "../../shared/ui/AppText";
import { Monedin } from "../../shared/brand/Monedin";
import { colors, radii } from "../../shared/theme/tokens";
import { error as errorHaptic } from "../../shared/theme/haptics";
import {
  announce,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 30;

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  const ref = useRef<ElementRef<typeof TextInput>>(null);
  const requestFocus = useDeferredFocus(busy);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(auth)/login");

  async function send() {
    if (!EMAIL.test(email.trim())) {
      setError("Escribe un correo como nombre@dominio.com");
      void errorHaptic();
      announce("Escribe un correo válido");
      requestFocus(() => ref.current?.focus());
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.forgotPassword(email.trim().toLowerCase());
      setSent(true);
      setWait(RESEND_SECONDS);
      announce(
        "Si el correo está registrado, te enviamos un enlace. Revisa tu bandeja de entrada.",
      );
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "No se pudo enviar el enlace";
      setError(text);
      void errorHaptic();
      announce(text);
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <AuthShell
        title="Revisa tu correo"
        subtitle={`Si ${email.trim()} tiene una cuenta en FINZA, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos.`}
        mascot={false}
        onBack={back}
        footer={
          <AppButton
            title={wait > 0 ? `Reenviar en ${wait} s` : "Reenviar enlace"}
            variant="ghost"
            disabled={wait > 0 || busy}
            busy={busy}
            onPress={send}
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: radii.lg,
            backgroundColor: colors.sage100,
          }}
        >
          <Monedin size="sm" motion="appear" />
          <AppText style={{ flex: 1, color: colors.ink }}>
            Abre el enlace desde este teléfono. Si no lo ves, busca en correo no
            deseado.
          </AppText>
        </View>
        <AppButton
          title="Volver a iniciar sesión"
          onPress={() => router.replace("/(auth)/login")}
        />
      </AuthShell>
    );

  return (
    <AuthShell
      title="Recupera tu acceso"
      subtitle="Te enviaremos un enlace para crear una contraseña nueva."
      onBack={back}
      backDisabled={busy}
    >
      <FormField
        ref={ref}
        label="Correo electrónico"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError("");
        }}
        error={error || undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        returnKeyType="send"
        onSubmitEditing={send}
      />
      <AppButton title="Enviar enlace" onPress={send} busy={busy} />
    </AuthShell>
  );
}
