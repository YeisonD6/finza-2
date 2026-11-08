import { useEffect, useState } from "react";
import { View } from "react-native";
import { MailCheck } from "lucide-react-native";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { announce } from "../../../shared/accessibility/announcements";
import { colors, radii } from "../../../shared/theme/tokens";
import { auth } from "../runtime";

// "Ahora no" lasts for this app session only; the reminder returns next launch.
let dismissed = false;
let serverSends: Promise<boolean> | null = null;
function serverCanSend() {
  serverSends ??= auth
    .providers()
    .then((p) => Boolean(p.email_verification))
    .catch(() => {
      serverSends = null;
      return false;
    });
  return serverSends;
}

/**
 * Gentle reminder to confirm the e-mail address. Never blocks the app. The parent
 * renders it only for unconfirmed accounts; it hides itself when the server cannot send mail.
 */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [canSend, setCanSend] = useState(false);
  const [hidden, setHidden] = useState(dismissed);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let live = true;
    void serverCanSend().then((value) => live && setCanSend(value));
    return () => {
      live = false;
    };
  }, []);

  if (!canSend || hidden) return null;

  async function resend() {
    setBusy(true);
    try {
      const message = await auth.resendVerification();
      setStatus(message);
      announce(message);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "No pudimos enviar el enlace";
      setStatus(text);
      announce(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      accessibilityRole="summary"
      style={{
        backgroundColor: colors.sage100,
        borderRadius: radii.lg,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <DecorativeIcon icon={MailCheck} size={22} color={colors.accent} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="subhead" accessibilityRole="header">
            Confirma tu correo
          </AppText>
          <AppText style={{ color: colors.inkMuted }}>
            {status ||
              `Confirma que ${email} es tuyo. Así protegemos tu cuenta y podrás recuperar el acceso si olvidas la contraseña.`}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <AppButton
          title={status ? "Reenviar enlace" : "Enviar enlace"}
          size="sm"
          busy={busy}
          onPress={() => void resend()}
        />
        <AppButton
          title="Ahora no"
          variant="ghost"
          size="sm"
          disabled={busy}
          onPress={() => {
            dismissed = true;
            setHidden(true);
          }}
        />
      </View>
    </View>
  );
}
