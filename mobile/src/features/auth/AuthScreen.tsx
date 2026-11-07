import { useEffect, useRef, useState, type ElementRef } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { CircleCheck, Eye, EyeOff } from "lucide-react-native";
import { AppText } from "../../shared/ui/AppText";
import { IconButton } from "../../shared/ui/IconButton";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { AppButton, FormField } from "../../shared/ui/AuthControls";
import { Feedback } from "../../shared/ui/Feedback";
import { colors } from "../../shared/theme/tokens";
import {
  error as errorHaptic,
  success as successHaptic,
} from "../../shared/theme/haptics";
import {
  announce,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";
import { auth } from "./runtime";
import {
  ApiError,
  type ExternalProvider,
  type ServerProviders,
} from "./client";
import {
  SocialCancelled,
  appleIdToken,
  googleIdToken,
  socialAvailability,
  type SocialAvailability,
} from "./social";
import { AuthShell } from "./components/AuthShell";
import { AuthDivider } from "./components/AuthDivider";
import { PasswordRequirement } from "./components/PasswordRequirement";
import { SocialButtons } from "./components/SocialButtons";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Busy = "email" | ExternalProvider | null;

export function AuthScreen({
  sessionMessage = "",
  initialRegister = false,
  onRetrySession,
}: {
  sessionMessage?: string;
  initialRegister?: boolean;
  onRetrySession?(): void;
} = {}) {
  const [register, setRegister] = useState(initialRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [server, setServer] = useState<ServerProviders | null>(null);
  const [social, setSocial] = useState<SocialAvailability>({
    google: false,
    apple: false,
  });
  const requestFocus = useDeferredFocus(busy !== null);
  const locked = useRef(false);
  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    let live = true;
    auth
      .providers()
      .catch(() => null)
      .then(async (providers) => {
        const available = await socialAvailability(providers);
        if (!live) return;
        setServer(providers);
        setSocial(available);
      });
    return () => {
      live = false;
    };
  }, []);

  const emailValid = EMAIL.test(email.trim());
  const passwordValid = register
    ? password.length >= 12 && password.length <= 128
    : password.length > 0;
  // Live validation once a field has been left, never while the person is still typing it the first time.
  const emailError =
    fields.email ??
    (touched.email && !emailValid
      ? "Escribe un correo como nombre@dominio.com"
      : undefined);
  const passwordError =
    fields.password ??
    (touched.password && !passwordValid
      ? register
        ? "Usa al menos 12 caracteres"
        : "Escribe tu contraseña"
      : undefined);

  function switchMode(value: boolean) {
    setRegister(value);
    setPassword("");
    setShow(false);
    setFields({});
    setMessage("");
    setTouched({ email: touched.email, password: false });
  }

  function fail(text: string, focus: "email" | "password" | null) {
    setMessage(text);
    void errorHaptic();
    announce(text);
    if (focus)
      requestFocus(() =>
        (focus === "email" ? emailRef : passwordRef).current?.focus(),
      );
  }

  async function submit() {
    if (locked.current) return;
    setTouched({ email: true, password: true });
    setFields({});
    setMessage("");
    if (!emailValid || !passwordValid) {
      const first = !emailValid ? "email" : "password";
      fail(
        !emailValid
          ? "Revisa tu correo electrónico"
          : register
            ? "La contraseña necesita al menos 12 caracteres"
            : "Escribe tu contraseña",
        first,
      );
      return;
    }
    locked.current = true;
    setBusy("email");
    auth.setRemember(remember);
    try {
      if (register) {
        await auth.register(email.trim(), password);
        try {
          await auth.login(email.trim(), password);
          void successHaptic();
          announce("Cuenta creada. Te damos la bienvenida a FINZA.");
        } catch {
          setRegister(false);
          setPassword("");
          setMessage("Cuenta creada. Ahora inicia sesión.");
          announce("Cuenta creada. Ahora inicia sesión.");
          requestFocus(() => passwordRef.current?.focus());
        }
      } else {
        await auth.login(email.trim(), password);
        void successHaptic();
        announce("Sesión iniciada");
      }
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud";
      const serverFields =
        error instanceof ApiError ? (error.fields ?? {}) : {};
      setFields(serverFields);
      fail(text, serverFields.password ? "password" : "email");
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  async function withProvider(provider: ExternalProvider) {
    if (locked.current) return;
    locked.current = true;
    setBusy(provider);
    setMessage("");
    auth.setRemember(remember);
    try {
      const { idToken, nonce } =
        provider === "google"
          ? { ...(await googleIdToken()), nonce: undefined }
          : await appleIdToken();
      await auth.loginWithProvider(provider, idToken, nonce);
      void successHaptic();
      announce("Sesión iniciada");
    } catch (error) {
      if (!(error instanceof SocialCancelled))
        fail(
          error instanceof Error ? error.message : "No se pudo iniciar sesión",
          null,
        );
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  const working = busy !== null;
  const hasSocial = social.apple || social.google;
  return (
    <AuthShell
      title={register ? "Crea tu cuenta" : "Hola de nuevo"}
      subtitle={
        register
          ? "Empieza en menos de un minuto. Tus datos son solo tuyos."
          : "Entra para ver cómo va tu mes."
      }
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/(auth)/welcome")
      }
      backDisabled={working}
      footer={
        <AppButton
          title={
            register
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Crea una"
          }
          variant="ghost"
          disabled={working}
          onPress={() => switchMode(!register)}
        />
      }
    >
      <Feedback message={sessionMessage} tone="error" />
      {sessionMessage && onRetrySession ? (
        <AppButton
          title="Reintentar sesión"
          variant="secondary"
          onPress={onRetrySession}
        />
      ) : null}
      <SocialButtons
        available={social}
        busy={busy === "google" || busy === "apple" ? busy : null}
        disabled={working}
        onApple={() => void withProvider("apple")}
        onGoogle={() => void withProvider("google")}
      />
      {hasSocial ? <AuthDivider label="o con tu correo" /> : null}
      <FormField
        ref={emailRef}
        label="Correo electrónico"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (fields.email) setFields(({ email: _, ...rest }) => rest);
        }}
        onBlur={() =>
          setTouched((t) => ({ ...t, email: email.length > 0 || t.email }))
        }
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType={register ? "username" : "emailAddress"}
        editable={!working}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        trailing={
          touched.email && emailValid && !fields.email ? (
            <View style={{ paddingHorizontal: 14 }}>
              <DecorativeIcon
                icon={CircleCheck}
                size={20}
                color={colors.forest600}
              />
            </View>
          ) : undefined
        }
      />
      <View style={{ gap: 8 }}>
        <FormField
          ref={passwordRef}
          label="Contraseña"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (fields.password) setFields(({ password: _, ...rest }) => rest);
          }}
          onBlur={() =>
            setTouched((t) => ({
              ...t,
              password: password.length > 0 || t.password,
            }))
          }
          error={passwordError}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={register ? "new-password" : "current-password"}
          textContentType={register ? "newPassword" : "password"}
          editable={!working}
          returnKeyType="go"
          onSubmitEditing={submit}
          trailing={
            <IconButton
              icon={show ? EyeOff : Eye}
              accessibilityLabel={
                show ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              onPress={() => setShow(!show)}
              disabled={working}
              accessibilityState={{ checked: show }}
            />
          }
        />
        {register ? (
          <PasswordRequirement
            met={password.length >= 12}
            label="Al menos 12 caracteres"
          />
        ) : server?.password_reset ? (
          <View style={{ alignItems: "flex-end" }}>
            <AppButton
              title="¿Olvidaste tu contraseña?"
              variant="ghost"
              size="sm"
              disabled={working}
              onPress={() =>
                router.push({
                  pathname: "/(auth)/forgot",
                  params: emailValid ? { email: email.trim() } : {},
                })
              }
            />
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: remember, disabled: working }}
        accessibilityLabel="Mantener la sesión iniciada"
        accessibilityHint="Si lo desactivas, tendrás que iniciar sesión cada vez que abras FINZA"
        disabled={working}
        onPress={() => setRemember(!remember)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 48,
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="label">Mantener la sesión iniciada</AppText>
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            En este teléfono, guardada de forma segura.
          </AppText>
        </View>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Switch
            value={remember}
            onValueChange={setRemember}
            disabled={working}
            trackColor={{ false: colors.borderStrong, true: colors.forest700 }}
            thumbColor={colors.surface}
            // react-native-web ignores thumbColor while on and falls back to teal.
            {...({ activeThumbColor: colors.surface } as object)}
          />
        </View>
      </Pressable>
      <Feedback
        message={message}
        tone={message.startsWith("Cuenta creada") ? "success" : "error"}
        announce={false}
      />
      <AppButton
        title={register ? "Crear cuenta" : "Iniciar sesión"}
        onPress={submit}
        busy={busy === "email"}
        disabled={working && busy !== "email"}
      />
    </AuthShell>
  );
}
