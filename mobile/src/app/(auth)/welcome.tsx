import { useEffect, useRef } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Monedin } from "../../shared/brand/Monedin";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { colors, durations, radii } from "../../shared/theme/tokens";
import { easeOut, useReducedMotion } from "../../shared/theme/motion";
import { useEntrance } from "../../shared/theme/entrance";

/**
 * First screen for guests. One authored moment: growth rings open behind
 * Monedin (the «Brote» idea: money that grows), he appears and then idles,
 * and the paper sheet rises with the promise and the two ways in.
 */
function GrowthRings({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      grow.setValue(1);
      return;
    }
    const animation = Animated.timing(grow, {
      toValue: 1,
      duration: 900,
      easing: easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [grow, reduced]);
  const rings = [0.42, 0.62, 0.82, 1];
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity: grow,
        transform: [
          {
            scale: grow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.86, 1],
            }),
          },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        {rings.map((r, index) => (
          <Circle
            key={r}
            cx={50}
            cy={50}
            r={r * 49}
            fill="none"
            stroke={colors.mint}
            strokeOpacity={0.22 - index * 0.045}
            strokeWidth={0.5}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

export default function Welcome() {
  const { width, height, fontScale } = useWindowDimensions();
  const block = useEntrance(4, { delay: 160 });
  const reduced = useReducedMotion();
  const sheet = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(sheet, {
      toValue: 1,
      duration: reduced ? 150 : durations.sheet,
      easing: easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [sheet, reduced]);
  const compact = height < 700 || fontScale > 1.3;
  const ringSize = Math.min(width * 0.92, compact ? 280 : 360);
  return (
    <View style={{ flex: 1, backgroundColor: colors.forest950 }}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
          <AppText
            variant="label"
            accessibilityRole="header"
            accessibilityLabel="FINZA"
            style={{ color: colors.onForest, letterSpacing: 3 }}
          >
            FINZA
          </AppText>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            minHeight: compact ? 220 : 300,
          }}
        >
          <GrowthRings size={ringSize} />
          <Monedin size={compact ? "md" : "hero"} motion="idle" />
        </View>
      </SafeAreaView>
      <Animated.View
        style={{
          backgroundColor: colors.ground,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingHorizontal: 24,
          paddingTop: 32,
          opacity: sheet,
          transform: reduced
            ? []
            : [
                {
                  translateY: sheet.interpolate({
                    inputRange: [0, 1],
                    outputRange: [32, 0],
                  }),
                },
              ],
        }}
      >
        <SafeAreaView edges={["bottom"]} style={{ gap: 12, paddingBottom: 12 }}>
          <Animated.View style={block(0)}>
            <AppText variant="hero">
              {"Tus cuentas claras.\nMonedin a tu lado."}
            </AppText>
          </Animated.View>
          <Animated.View style={[block(1), { marginBottom: 16 }]}>
            <AppText style={{ color: colors.inkMuted }}>
              Registra en segundos, entiende en qué se va tu dinero y haz crecer
              tus metas. Sin anuncios y sin vender tus datos.
            </AppText>
          </Animated.View>
          <Animated.View style={block(2)}>
            <AppButton
              title="Comenzar"
              onPress={() => router.push("/(auth)/onboarding")}
            />
          </Animated.View>
          <Animated.View style={block(3)}>
            <AppButton
              title="Ya tengo una cuenta"
              variant="ghost"
              onPress={() => router.push("/(auth)/login")}
            />
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
