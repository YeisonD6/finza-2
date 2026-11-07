import { useRef, useState, type ElementRef } from "react";
import { TextInput } from "react-native";
import { announce, useDeferredFocus } from "../accessibility/announcements";
import { error as errorHaptic } from "../theme/haptics";
/** Serialized mutations and focus after inputs become editable again. */
export function useFormFeedback() {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const refs = useRef<Record<string, ElementRef<typeof TextInput> | null>>({});
  const focus = useDeferredFocus(busy);
  function fail(errors: Record<string, string>, fallback?: string) {
    setFields(errors);
    const text =
      fallback ||
      Object.values(errors)[0] ||
      "No se pudo guardar. Revisa tu conexión y reintenta.";
    setMessage(text);
    announce(text);
    void errorHaptic();
    focus(() => refs.current[Object.keys(errors)[0]]?.focus());
  }
  function serverError(error: unknown) {
    const data = (
      error as {
        data?: { message?: string; field_errors?: Record<string, string> };
      }
    )?.data;
    fail(data?.field_errors ?? {}, data?.message);
  }
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    setFields({});
    try {
      await action();
    } catch (error) {
      serverError(error);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    fields,
    message,
    refs,
    fail,
    run,
    clear: () => {
      setFields({});
      setMessage("");
    },
  };
}
