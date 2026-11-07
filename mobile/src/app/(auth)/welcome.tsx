import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
import { useRef, useState, type ElementRef } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../shared/ui/Screen";
import { Monedin } from "../../shared/brand/Monedin";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Card } from "../../shared/ui/Card";
import { AmountText } from "../../shared/ui/AmountText";
import { MovementRow } from "../../shared/ui/MovementRow";
import { SproutProgress } from "../../shared/ui/SproutProgress";
import { markOnboarded } from "../../features/auth/storage";
import { colors } from "../../shared/theme/tokens";
const steps = [
  {
    title: "Hola, soy Monedin",
    body: "Te acompaño a entender tu dinero mes a mes.",
  },
  {
    title: "Registra en segundos",
    body: "Anota ingresos y gastos en pesos colombianos, exactos al centavo. Por ejemplo: un gasto de alimentación de $ 18.500 y un flujo neto de $ 81.500.",
  },
  {
    title: "Mira crecer tus metas",
    body: "Cada aporte te acerca a lo que quieres. Así se ve una meta con el 65 % de su camino recorrido.",
  },
];
function StepVisual({ step, active }: { step: number; active: boolean }) {
  if (step === 0)
    return <Monedin size="hero" motion={active ? "idle" : "none"} />;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ alignSelf: "stretch" }}
    >
      <Card>
        {step === 1 ? (
          <>
            <AppText variant="label">Flujo neto del mes · Ejemplo</AppText>
            <AmountText value="81500.00" variant="heading" />
            <MovementRow
              movement={{
                id: "example",
                type: "expense",
                amount: "18500.00",
                currency: "COP",
                occurred_on: "2026-11-07",
                category_id: "example",
                note: "Almuerzo · Ejemplo",
                client_request_id: "example",
              }}
              category="Alimentación"
            />
          </>
        ) : (
          <>
            <AppText variant="heading">Mi próxima meta · Ejemplo</AppText>
            <SproutProgress value={65} text="65 % de tu meta" />
          </>
        )}
      </Card>
    </View>
  );
}
export default function Welcome() {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const [step, setStep] = useState(0);
  const scroll = useRef<ElementRef<typeof ScrollView>>(null);
  const { width, height, fontScale } = useWindowDimensions();
  const pageWidth = width - 40;
  function finish() {
    void markOnboarded().then(() =>
      router.replace(profile ? "/(tabs)/profile" : "/(auth)/login"),
    );
  }
  return (
    <Screen
      title=""
      footer={
        <View style={{ gap: 12 }}>
          <View
            accessible
            accessibilityLabel={`Paso ${step + 1} de 3`}
            accessibilityLiveRegion="polite"
            style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            {steps.map((_, index) => (
              <View
                key={index}
                style={{
                  width: step === index ? 24 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor:
                    step === index ? colors.forest700 : colors.border,
                }}
              />
            ))}
          </View>
          <AppButton
            title={step < 2 ? "Siguiente" : "Empezar"}
            onPress={() => {
              if (step === 2) finish();
              else {
                setStep(step + 1);
                scroll.current?.scrollTo({
                  x: (step + 1) * pageWidth,
                  animated: false,
                });
              }
            }}
          />
        </View>
      }
    >
      {() => (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={{ alignItems: "flex-end" }}>
            <AppButton title="Saltar" variant="ghost" onPress={finish} />
          </View>
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) =>
              setStep(
                Math.max(
                  0,
                  Math.min(
                    2,
                    Math.round(event.nativeEvent.contentOffset.x / pageWidth),
                  ),
                ),
              )
            }
          >
            {steps.map((item, index) => (
              <ScrollView
                key={item.title}
                style={{ width: pageWidth }}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  gap: 24,
                  alignItems: "center",
                  minHeight: fontScale > 1.5 ? height * 0.75 : undefined,
                }}
                accessibilityElementsHidden={step !== index}
                importantForAccessibility={
                  step === index ? "auto" : "no-hide-descendants"
                }
              >
                <StepVisual step={index} active={step === index} />
                <AppText
                  variant="title"
                  accessibilityRole="header"
                  style={{ textAlign: "center" }}
                >
                  {item.title}
                </AppText>
                <AppText
                  style={{ textAlign: "center", color: colors.inkMuted }}
                >
                  {item.body}
                </AppText>
              </ScrollView>
            ))}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}
