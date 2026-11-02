import { useRef, useState, ElementRef } from "react";
import { TextInput } from "react-native";
import { auth } from "./runtime";
import { ApiError } from "./client";
import { AppButton, FormField } from "../../shared/ui/AuthControls";
import { Screen } from "../../shared/ui/Screen";
import { Feedback } from "../../shared/ui/Feedback";
import {
  announce,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";

export function AuthScreen({
  sessionMessage = "",
  onRetrySession,
}: { sessionMessage?: string; onRetrySession?(): void } = {}) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestFocus = useDeferredFocus(busy);
  const locked = useRef(false);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);

  function switchMode(value: boolean) {
    setRegister(value);
    setPassword("");
    setShow(false);
    setFields({});
    setMessage("");
  }

  async function submit() {
    if (locked.current) return;
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Ingresa un correo válido";
    if (password.length < (register ? 12 : 1) || password.length > 128)
      errors.password = register
        ? "La contraseña debe tener entre 12 y 128 caracteres"
        : "Ingresa tu contraseña";
    setFields(errors);
    setMessage("");
    if (Object.keys(errors).length) {
      requestFocus(() =>
        (errors.email ? emailRef : passwordRef).current?.focus(),
      );
      announce(Object.values(errors)[0]);
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      if (register) {
        await auth.register(email.trim(), password);
        setRegister(false);
        setPassword("");
        setShow(false);
        setMessage("Cuenta creada. Ahora inicia sesión.");
        announce("Cuenta creada. Ahora inicia sesión.");
      } else {
        await auth.login(email.trim(), password);
      }
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud";
      setMessage(text);
      if (error instanceof ApiError) setFields(error.fields ?? {});
      announce(text);
      if (error instanceof ApiError && error.fields?.email)
        requestFocus(() => emailRef.current?.focus());
      else if (error instanceof ApiError && error.fields?.password)
        requestFocus(() => passwordRef.current?.focus());
      else requestFocus(() => emailRef.current?.focus());
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen
      title={register ? "Crear cuenta en Finza" : "Iniciar sesión en Finza"}
      onBack={register ? () => switchMode(false) : undefined}
      backLabel="Ya tengo cuenta"
      backDisabled={busy}
    >
      <Feedback message={sessionMessage} tone="error" />
      {sessionMessage && onRetrySession ? (
        <AppButton title="Reintentar sesión" onPress={onRetrySession} />
      ) : null}
      <FormField
        ref={emailRef}
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        error={fields.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!busy}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormField
        ref={passwordRef}
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={fields.password}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={register ? "new-password" : "current-password"}
        textContentType={register ? "newPassword" : "password"}
        editable={!busy}
        onSubmitEditing={submit}
      />
      <AppButton
        title={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        onPress={() => setShow(!show)}
        disabled={busy}
      />
      <Feedback
        message={message}
        tone={message.startsWith("Cuenta creada") ? "success" : "error"}
        announce={false}
      />
      <AppButton
        title={register ? "Crear cuenta" : "Ingresar"}
        onPress={submit}
        busy={busy}
      />
      {!register ? (
        <AppButton
          title="Registrarme"
          onPress={() => switchMode(true)}
          disabled={busy}
        />
      ) : null}
    </Screen>
  );
}
