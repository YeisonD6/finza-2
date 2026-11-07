import { useRef, useState, type ElementRef } from "react";
import { TextInput } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
import { AuthShell } from "../../features/auth/components/AuthShell";
import {
  NewPasswordFields,
  passwordProblem,
} from "../../features/auth/components/NewPasswordFields";
import { auth } from "../../features/auth/runtime";
import { AppButton, FormField } from "../../shared/ui/AuthControls";
import { Feedback } from "../../shared/ui/Feedback";
import {
  error as errorHaptic,
  success as successHaptic,
} from "../../shared/theme/haptics";
import {
  announce,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";

/** Change the password, or create a first one for Google/Apple accounts. */
export default function ChangePassword() {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const hasPassword = profile?.has_password !== false;
  const [current, setCurrent] = useState("");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const currentRef = useRef<ElementRef<typeof TextInput>>(null);
  const newRef = useRef<ElementRef<typeof TextInput>>(null);
  const requestFocus = useDeferredFocus(busy);

  async function save() {
    const problem =
      hasPassword && !current
        ? "Escribe tu contraseña actual"
        : passwordProblem(value, confirm);
    if (problem) {
      setError(problem);
      void errorHaptic();
      announce(problem);
      requestFocus(() =>
        (hasPassword && !current ? currentRef : newRef).current?.focus(),
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.changePassword(hasPassword ? current : null, value);
      setCurrent("");
      setValue("");
      setConfirm("");
      const text = hasPassword
        ? "Contraseña actualizada. Cerramos tus sesiones en otros dispositivos."
        : "Contraseña creada. Ahora también puedes entrar con tu correo.";
      setSaved(text);
      void successHaptic();
      announce(text);
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "No se pudo cambiar la contraseña";
      setError(text);
      void errorHaptic();
      announce(text);
      requestFocus(() => (hasPassword ? currentRef : newRef).current?.focus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
      subtitle={
        hasPassword
          ? "Tu sesión en este teléfono seguirá abierta."
          : "Entraste con Google o Apple. Crea una contraseña para entrar también con tu correo."
      }
      mascot={false}
      onBack={() => router.back()}
      backDisabled={busy}
    >
      {hasPassword ? (
        <FormField
          ref={currentRef}
          label="Contraseña actual"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />
      ) : null}
      <NewPasswordFields
        ref={newRef}
        value={value}
        confirm={confirm}
        onChange={setValue}
        onConfirm={setConfirm}
        disabled={busy}
        onSubmit={save}
      />
      <Feedback message={error} tone="error" announce={false} />
      <Feedback message={saved} tone="success" announce={false} />
      <AppButton title="Guardar" onPress={save} busy={busy} />
    </AuthShell>
  );
}
