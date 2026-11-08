import { useState } from "react";
import { Pressable, View } from "react-native";
import { PencilLine } from "lucide-react-native";
import { TextField } from "../../../shared/ui/TextField";
import { AppButton } from "../../../shared/ui/AppButton";
import { AppText } from "../../../shared/ui/AppText";
import { Banner } from "../../../shared/ui/Banner";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { parseQuickEntry } from "../../quick-entry/parser";
import { announce } from "../../../shared/accessibility/announcements";
import { colors, useThemeRefresh } from "../../../shared/theme/tokens";
import type { useMovementDraft } from "./useMovementDraft";
/**
 * «almuerzo 18 mil ayer» fills the form for review. It sits behind one pill so the
 * sheet opens on the amount; the pill reports whether the phrase field is shown.
 */
export function QuickEntryField({
  draft: f,
}: {
  draft: ReturnType<typeof useMovementDraft>;
}) {
  useThemeRefresh();
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [explanation, setExplanation] = useState("");
  function interpret() {
    if (f.busy) return;
    const result = parseQuickEntry(text, f.categories);
    f.change();
    f.setType(result.type);
    f.setAmount(result.amount?.replace(".", ",") ?? "");
    f.setDate(result.occurred_on);
    f.setCategory(result.category_id ?? "");
    f.setNote(result.note);
    setExplanation(result.explanation);
    announce(result.explanation);
    f.amountRef.current?.focus();
  }
  return (
    <View style={{ gap: 12, flexShrink: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Escribir como frase"
        accessibilityHint="Muestra un campo para escribir o dictar el movimiento"
        accessibilityState={{ expanded: open, disabled: f.busy }}
        disabled={f.busy}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => ({
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          paddingHorizontal: 16,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: open ? colors.accent : colors.glassBorder,
          backgroundColor: pressed || open ? colors.sage100 : colors.glass,
          opacity: f.busy ? 0.6 : 1,
        })}
      >
        <DecorativeIcon
          icon={PencilLine}
          size={18}
          strokeWidth={2}
          color={colors.accent}
        />
        <AppText variant="label" style={{ color: colors.accent }}>
          Escribir como frase
        </AppText>
      </Pressable>
      {open ? (
        <>
          <TextField
            label="Escribe o dicta tu movimiento"
            placeholder="Ej.: almuerzo 18 mil ayer"
            hint="Rellena el formulario para que lo revises antes de guardar"
            value={text}
            onChangeText={setText}
            editable={!f.busy}
            returnKeyType="done"
            autoFocus
            onSubmitEditing={interpret}
          />
          <AppButton
            title="Interpretar"
            variant="secondary"
            disabled={f.busy || f.isLoading || !!f.categoryError}
            onPress={interpret}
          />
        </>
      ) : null}
      <Banner message={explanation} announce={false} />
    </View>
  );
}
