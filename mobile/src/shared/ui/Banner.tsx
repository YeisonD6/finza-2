import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useAnnouncement } from "../accessibility/announcements";
import { AppText } from "./AppText";
import { Monedin } from "../brand/Monedin";
import { colors, radii, useThemeRefresh } from "../theme/tokens";
import { durations, easeOut, useReducedMotion } from "../theme/motion";
import { error, success } from "../theme/haptics";
export function Banner({
  message,
  tone = "status",
  announce = true,
  celebrate = false,
}: {
  message: string;
  tone?: "error" | "success" | "status";
  announce?: boolean;
  celebrate?: boolean;
}) {
  useThemeRefresh();
  useAnnouncement(announce ? message : "");
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(message);
  const last = useRef("");
  useEffect(() => {
    if (announce && message && last.current !== message) {
      if (tone === "error") void error();
      if (tone === "success") void success();
    }
    last.current = message;
  }, [message, tone, announce]);
  useEffect(() => {
    if (message) {
      setShown(message);
      opacity.setValue(0);
    }
    const animation = Animated.timing(opacity, {
      toValue: message ? 1 : 0,
      duration: message ? durations.bannerIn : durations.bannerOut,
      easing: easeOut,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !message) setShown("");
    });
    return () => animation.stop();
  }, [message, opacity, reduced]);
  if (!shown) return null;
  return (
    <Animated.View
      style={{
        padding: 16,
        borderRadius: radii.md,
        backgroundColor: tone === "error" ? colors.cream : colors.sage100,
        gap: 8,
        opacity,
        transform: reduced
          ? []
          : [
              {
                translateY: opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
      }}
    >
      {celebrate ? (
        <Monedin size="sm" motion="celebrate" haptic={false} />
      ) : null}
      <AppText
        accessibilityRole={tone === "error" ? "alert" : "text"}
        style={{ color: tone === "error" ? colors.danger : colors.accent }}
      >
        {shown}
      </AppText>
    </Animated.View>
  );
}
