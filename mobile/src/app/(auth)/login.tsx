import { useLocalSearchParams } from "expo-router";
import { AuthScreen } from "../../features/auth/AuthScreen";
import { useSession } from "../../features/auth/SessionProvider";
export default function Login() {
  const session = useSession();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return (
    <AuthScreen
      initialRegister={mode === "register"}
      sessionMessage={session.message}
      onRetrySession={session.restore}
    />
  );
}
