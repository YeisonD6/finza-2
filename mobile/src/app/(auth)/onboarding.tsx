import { useSelector } from "react-redux";
import { useRef, useState, type ElementRef, type ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { RootState } from "../../core/store";
import { TrendingUp } from "lucide-react-native";
import { Monedin } from "../../shared/brand/Monedin";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { AmountText } from "../../shared/ui/AmountText";
import { MovementRow } from "../../shared/ui/MovementRow";
import { categoryIcon } from "../../shared/ui/categoryIcon";
import { categoryTone } from "../../shared/ui/categoryTheme";
import Svg, { Circle } from "react-native-svg";
import { SproutProgress } from "../../shared/ui/SproutProgress";
import { markOnboarded } from "../../features/auth/storage";
import { colors, radii, shadows } from "../../shared/theme/tokens";
import { useReducedMotion } from "../../shared/theme/motion";

/** Four short steps that show the product with sample data instead of describing it. */
const steps = [
  {
    title: "Tu mes, de un vistazo",
    body: "Ingresos, gastos y flujo neto del mes, y cómo vas frente al mes anterior.",
  },
  {
    title: "Registra en segundos",
    body: "Escribe «almuerzo 18 mil ayer» y FINZA llena el formulario por ti. Tú revisas y guardas.",
  },
  {
    title: "Descubre en qué se va",
    body: "Mira qué categorías se llevan tu dinero, con montos y porcentajes, sin depender de colores.",
  },
  {
    title: "Haz crecer tus metas",
    body: "Aparta dinero para lo que quieres. Monedin te acompaña y celebra contigo cada avance.",
  },
];

function Sample({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        {
          alignSelf: "stretch",
          borderRadius: radii.lg,
          padding: 20,
          gap: 12,
          backgroundColor: dark ? colors.forest700 : colors.surface,
        },
        shadows.card,
      ]}
    >
      {children}
    </View>
  );
}

function StepVisual({ step }: { step: number }) {
  if (step === 0)
    return (
      <Sample dark>
        <AppText variant="caption" style={{ color: colors.onForestMuted }}>
          Flujo neto del mes · Ejemplo
        </AppText>
        <AppText
          variant="display"
          style={{ color: colors.onForest, fontVariant: ["tabular-nums"] }}
        >
          $ 1.776.400
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <DecorativeIcon
            icon={TrendingUp}
            size={16}
            color={colors.onForestMuted}
          />
          <AppText variant="caption" style={{ color: colors.onForestMuted }}>
            $ 783.400 más que octubre
          </AppText>
        </View>
      </Sample>
    );
  if (step === 1)
    return (
      <Sample>
        <View
          style={{
            borderRadius: radii.control,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <AppText>almuerzo 18 mil ayer</AppText>
        </View>
        <MovementRow
          movement={{
            id: "example",
            type: "expense",
            amount: "18000.00",
            currency: "COP",
            occurred_on: "2026-11-06",
            category_id: "example",
            note: "Almuerzo",
            client_request_id: "example",
          }}
          category="Alimentación"
          last
        />
      </Sample>
    );
  if (step === 2) {
    const rows = [
      ["Servicios", "1191200.00", 1],
      ["Alimentación", "413900.00", 0.35],
      ["Transporte", "268500.00", 0.23],
    ] as const;
    const tones = rows.map(([name]) => categoryTone(name));
    return (
      <Sample>
        {rows.map(([name, value, share], index) => (
          <View key={name} style={{ gap: 6 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tones[index].tint,
                }}
              >
                <DecorativeIcon
                  icon={categoryIcon(name)}
                  size={16}
                  color={tones[index].ink}
                />
              </View>
              <AppText variant="label" style={{ flex: 1 }}>
                {name}
              </AppText>
              <AmountText value={value} variant="label" />
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.track,
              }}
            >
              <View
                style={{
                  width: `${share * 100}%`,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: tones[index].chart,
                }}
              />
            </View>
          </View>
        ))}
      </Sample>
    );
  }
  return (
    <Sample>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Monedin size="sm" />
        <View style={{ flex: 1 }}>
          <AppText variant="subhead">Viaje a Cartagena</AppText>
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            $ 1.300.000 de $ 2.000.000
          </AppText>
        </View>
      </View>
      <SproutProgress kind="goal" value={65} text="65 % de tu meta" />
    </Sample>
  );
}

/** Soft sage disc and growth rings behind each sample, so the step has a place to sit. */
function Stage({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.95, 380);
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 32,
      }}
    >
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ position: "absolute", width: size, height: size }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={36} fill={colors.sage100} />
          {[42, 49].map((r, index) => (
            <Circle
              key={r}
              cx={50}
              cy={50}
              r={r}
              fill="none"
              stroke={colors.sage300}
              strokeOpacity={0.5 - index * 0.2}
              strokeWidth={0.4}
            />
          ))}
        </Svg>
      </View>
      {children}
    </View>
  );
}

export default function Onboarding() {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const [step, setStep] = useState(0);
  const scroll = useRef<ElementRef<typeof ScrollView>>(null);
  const { width, height, fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const last = steps.length - 1;
  function finish() {
    void markOnboarded().then(() =>
      router.replace(
        profile
          ? "/(tabs)/profile"
          : { pathname: "/(auth)/login", params: { mode: "register" } },
      ),
    );
  }
  function go(index: number) {
    setStep(index);
    scroll.current?.scrollTo({ x: index * width, animated: !reduced });
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        <AppButton
          title="Atrás"
          variant="ghost"
          size="sm"
          disabled={step === 0}
          accessibilityElementsHidden={step === 0}
          style={{ opacity: step === 0 ? 0 : 1 }}
          onPress={() => go(step - 1)}
        />
        <AppButton title="Saltar" variant="ghost" size="sm" onPress={finish} />
      </View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(event) =>
          setStep(
            Math.max(
              0,
              Math.min(
                last,
                Math.round(event.nativeEvent.contentOffset.x / width),
              ),
            ),
          )
        }
      >
        {steps.map((item, index) => (
          <ScrollView
            key={item.title}
            style={{ width }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingVertical: 16,
              gap: 28,
              minHeight: fontScale > 1.5 ? height * 0.7 : undefined,
            }}
            accessibilityElementsHidden={step !== index}
            importantForAccessibility={
              step === index ? "auto" : "no-hide-descendants"
            }
          >
            <Stage>
              <StepVisual step={index} />
            </Stage>
            <View style={{ gap: 8 }}>
              <AppText variant="title" accessibilityRole="header">
                {item.title}
              </AppText>
              <AppText style={{ color: colors.inkMuted }}>{item.body}</AppText>
            </View>
          </ScrollView>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: 16, gap: 20 }}>
        <View
          accessible
          accessibilityLabel={`Paso ${step + 1} de ${steps.length}`}
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", gap: 6 }}
        >
          {steps.map((_, index) => (
            <View
              key={index}
              style={{
                width: step === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  step === index ? colors.forest700 : colors.border,
              }}
            />
          ))}
        </View>
        <AppButton
          title={
            step < last ? "Siguiente" : profile ? "Listo" : "Crear mi cuenta"
          }
          onPress={() => (step === last ? finish() : go(step + 1))}
        />
      </View>
    </SafeAreaView>
  );
}
