import { useRef, useState, type ElementRef } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { CircleAlert } from "lucide-react-native";
import type { RootState } from "../../core/store";
import { AuthShell } from "../../features/auth/components/AuthShell";
import { auth } from "../../features/auth/runtime";
import { googleSignOut } from "../../features/auth/social";
import { AppButton, FormField } from "../../shared/ui/AuthControls";
import { AppText } from "../../shared/ui/AppText";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { Feedback } from "../../shared/ui/Feedback";
import { colors, radii } from "../../shared/theme/tokens";
import { error as errorHaptic } from "../../shared/theme/haptics";
import {
  announce,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";

const LOST = [
  "Todos tus movimientos y categorías personales",
  "Tus presupuestos y metas con sus aportes",
  "Tus sesiones abiertas en otros dispositivos",
];

/**
 * Permanent account deletion (required by the App Store for apps that create
 * accounts). The typed e-mail confirms intent; accounts with a password also
 * re-enter it. Nothing happens until both match.
 */
export default function DeleteAccount() {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const hasPassword = profile?.has_password !== false;
  const email = profile?.email ?? "";
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);
  const requestFocus = useDeferredFocus(busy);
  const matches = typed.trim().toLowerCase() === email;
  const ready = matches && (!hasPassword || password.length > 0);

  function fail(text: string, focus: "email" | "password") {
    setError(text);
    void errorHaptic();
    announce(text);
    requestFocus(() =>
      (focus === "email" ? emailRef : passwordRef).current?.focus(),
    );
  }

  async function remove() {
    if (!matches)
      return fail("Escribe tu correo tal como aparece arriba", "email");
    if (hasPassword && !password)
      return fail("Escribe tu contraseña para confirmar", "password");
    setBusy(true);
    setError("");
    try {
      await auth.deleteAccount(
        typed.trim().toLowerCase(),
        hasPassword ? password : null,
      );
      await googleSignOut();
      announce("Tu cuenta y tus datos fueron eliminados");
      router.replace("/(auth)/welcome");
    } catch (e) {
      setBusy(false);
      fail(
        e instanceof Error ? e.message : "No se pudo eliminar la cuenta",
        hasPassword ? "password" : "email",
      );
    }
  }

  return (
    <AuthShell
      title="Eliminar cuenta"
      subtitle="Esta acción es permanente y no se puede deshacer."
      mascot={false}
      onBack={() => router.back()}
      backDisabled={busy}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <DecorativeIcon icon={CircleAlert} size={20} color={colors.danger} />
          <AppText variant="subhead" accessibilityRole="header">
            Se borrará de inmediato
          </AppText>
        </View>
        {LOST.map((item) => (
          <AppText key={item} style={{ color: colors.inkMuted }}>
            • {item}
          </AppText>
        ))}
      </View>
      <FormField
        ref={emailRef}
        label={`Escribe ${email} para confirmar`}
        value={typed}
        onChangeText={(value) => {
          setTyped(value);
          if (error) setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={!busy}
        returnKeyType={hasPassword ? "next" : "done"}
        onSubmitEditing={() =>
          hasPassword ? passwordRef.current?.focus() : undefined
        }
      />
      {hasPassword ? (
        <FormField
          ref={passwordRef}
          label="Tu contraseña"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError("");
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
          returnKeyType="done"
        />
      ) : null}
      <Feedback message={error} tone="error" announce={false} />
      <AppButton
        title="Eliminar mi cuenta para siempre"
        variant="danger"
        busy={busy}
        disabled={!ready && !busy}
        accessibilityHint="Borra tu cuenta y todos tus datos de FINZA"
        onPress={() => void remove()}
      />
      <AppButton
        title="Cancelar"
        variant="ghost"
        disabled={busy}
        onPress={() => router.back()}
      />
    </AuthShell>
  );
}
