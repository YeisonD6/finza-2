import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./runtime";
import { googleSignOut } from "./social";
import { announce } from "../../shared/accessibility/announcements";
const Context = createContext({
  message: "",
  busy: false,
  restore: async () => {},
  logout: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const restoring = useRef<Promise<void> | null>(null);
  const restore = useCallback(() => {
    if (restoring.current) return restoring.current;
    setMessage("");
    restoring.current = auth
      .restore()
      .catch((e) => {
        setMessage(
          e instanceof Error ? e.message : "No se pudo recuperar la sesión",
        );
      })
      .finally(() => {
        restoring.current = null;
      });
    return restoring.current;
  }, []);
  useEffect(() => {
    void restore();
  }, [restore]);
  const logout = async () => {
    setBusy(true);
    try {
      await auth.logout();
      await googleSignOut();
      setMessage("");
      announce("Sesión cerrada");
    } catch {
      setMessage(
        "Sesión cerrada localmente. No se pudo confirmar la revocación remota o el almacenamiento seguro; reintenta con conexión.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Context.Provider value={{ message, busy, restore, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
