import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, findNodeHandle } from "react-native";

export function announce(message: string) {
  if (!message) return;
  if (Platform.OS === "ios")
    AccessibilityInfo.announceForAccessibilityWithOptions(message, {
      queue: true,
    });
  else AccessibilityInfo.announceForAccessibility(message);
}

/** Retries may announce the same error; rendered statuses announce once per change. */
export function useAnnouncement(message: string) {
  const last = useRef("");
  useEffect(() => {
    if (message && message !== last.current) announce(message);
    last.current = message;
  }, [message]);
}

export function focusAccessibility(
  target: Parameters<typeof findNodeHandle>[0],
) {
  const handle = findNodeHandle(target);
  if (typeof handle === "number")
    AccessibilityInfo.setAccessibilityFocus(handle);
}

/** TextInput ignores focus while noneditable: wait for the enabled render to commit. */
export function useDeferredFocus(blocked: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (blocked || !pending) return;
    const frame = requestAnimationFrame(() => {
      pending();
      setPending(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [blocked, pending]);
  return (focus: () => void) => setPending(() => focus);
}
