import { useRef, useState, ElementRef } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "./runtime";
import { ApiError } from "./client";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";

export function AuthScreen() {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);

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
      (errors.email ? emailRef : passwordRef).current?.focus();
      AccessibilityInfo.announceForAccessibility(Object.values(errors)[0]);
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      if (register) {
        await auth.register(email.trim(), password);
        setRegister(false);
        setPassword("");
        setMessage("Cuenta creada. Ahora inicia sesión.");
        AccessibilityInfo.announceForAccessibility(
          "Cuenta creada. Ahora inicia sesión.",
        );
        emailRef.current?.focus();
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
      AccessibilityInfo.announceForAccessibility(text);
      if (error instanceof ApiError && error.fields?.password)
        passwordRef.current?.focus();
      else emailRef.current?.focus();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text accessibilityRole="header" style={styles.title}>
            {register ? "Crear cuenta en Finza" : "Iniciar sesión en Finza"}
          </Text>
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
          {message ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {message}
            </Text>
          ) : null}
          <AppButton
            title={register ? "Crear cuenta" : "Ingresar"}
            onPress={submit}
            busy={busy}
          />
          <AppButton
            title={register ? "Ya tengo cuenta" : "Registrarme"}
            onPress={() => {
              setRegister(!register);
              setPassword("");
              setShow(false);
              setFields({});
              setMessage("");
              emailRef.current?.focus();
            }}
            disabled={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
