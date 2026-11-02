import React, { createRef, useState, type ElementRef } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Text,
  TextInput,
} from "react-native";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { AppButton, FormField } from "../AuthControls";
import { AmountInput } from "../AmountInput";
import { Screen } from "../Screen";
import { Feedback } from "../Feedback";
import { colors } from "../styles";
import * as announcements from "../../accessibility/announcements";

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

test("button forwards label, hint, role, value and selection; busy blocks activation", async () => {
  const press = jest.fn();
  const view = await render(
    <AppButton
      title="Guardar"
      onPress={press}
      selected
      accessibilityHint="Guarda los cambios"
      accessibilityValue={{ text: "COP" }}
    />,
  );
  const button = screen.getByRole("button", { name: "Guardar" });
  expect(button.props.accessibilityHint).toBe("Guarda los cambios");
  expect(button.props.accessibilityValue.text).toBe("COP");
  expect(button.props.accessibilityState.selected).toBe(true);
  expect(screen.getByText("Guardar ✓ Seleccionado")).toBeTruthy();
  expect(button).toHaveStyle({ minHeight: 48, minWidth: 48 });
  await view.rerender(<AppButton title="Guardar" onPress={press} busy />);
  expect(
    screen.getByRole("button", { name: "Guardar" }).props.accessibilityState,
  ).toEqual(expect.objectContaining({ disabled: true, busy: true }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(press).not.toHaveBeenCalled();
  expect(screen.getByText("Procesando…")).toBeTruthy();
});

test("button exposes keyboard focus visually and propagates native events", async () => {
  const focus = jest.fn(),
    blur = jest.fn();
  await render(
    <AppButton
      title="Volver"
      onPress={() => {}}
      onFocus={focus}
      onBlur={blur}
    />,
  );
  await fireEvent(screen.getByRole("button"), "focus", {});
  expect(screen.getByRole("button")).toHaveStyle({
    borderColor: colors.background,
  });
  expect(screen.getByText("Volver")).toHaveStyle({
    textDecorationLine: "underline",
  });
  expect(focus).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByRole("button"), "blur", {});
  expect(blur).toHaveBeenCalledTimes(1);
});

test("identical field labels get distinct stable native associations; error is part of the field hint", async () => {
  const view = await render(
    <>
      <FormField
        label="Fecha"
        value="conservar"
        error="Revisa la fecha"
        hint="Usa YYYY-MM-DD"
      />
      <FormField label="Fecha" value="otra" />
    </>,
  );
  const fields = screen.getAllByLabelText("Fecha");
  const id = fields[0].props.accessibilityLabelledBy;
  expect(id).not.toBe(fields[1].props.accessibilityLabelledBy);
  expect(screen.getAllByText("Fecha")[0].props.nativeID).toBe(id);
  expect(fields[0].props.accessibilityHint).toContain(
    "Usa YYYY-MM-DD. Error: Revisa la fecha",
  );
  expect(fields[0].props.value).toBe("conservar");
  expect(screen.getByRole("alert")).toHaveStyle({ color: colors.error });
  await view.rerender(
    <>
      <FormField label="Fecha" value="conservar" />
      <FormField label="Fecha" value="otra" />
    </>,
  );
  expect(
    screen.getAllByLabelText("Fecha")[0].props.accessibilityLabelledBy,
  ).toBe(id);
});

test("field forwards focus ref, autofill and read-only state without announcing secret values", async () => {
  const ref = createRef<ElementRef<typeof TextInput>>();
  await render(
    <FormField
      ref={ref}
      label="Contraseña"
      value="never-announce-this"
      secureTextEntry
      autoComplete="current-password"
      editable={false}
    />,
  );
  expect(ref.current).not.toBeNull();
  expect(typeof ref.current?.focus).toBe("function");
  const field = screen.getByLabelText("Contraseña");
  expect(field.props.autoComplete).toBe("current-password");
  expect(field.props.secureTextEntry).toBe(true);
  expect(field).toHaveStyle({ minHeight: 48 });
  expect(field.props.accessibilityState.disabled).toBe(true);
  expect(field.props.accessibilityValue).toBeUndefined();
  expect(String(field.props.accessibilityHint ?? "")).not.toContain(
    "never-announce-this",
  );
});

test("shared typography allows native scaling and multiline button labels", async () => {
  await render(
    <Screen title="Título largo">
      <FormField label="Campo" />
      <AppButton title="Una acción extensa" onPress={() => {}} />
    </Screen>,
  );
  for (const text of [
    screen.getByRole("header"),
    screen.getByText("Campo"),
    screen.getByText("Una acción extensa"),
  ]) {
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(text.props.numberOfLines).toBeUndefined();
  }
  expect(screen.getByLabelText("Campo").props.allowFontScaling).not.toBe(false);
});

test("COP input keeps huge amounts, comma and trailing zeroes as user-entered strings", async () => {
  function Input() {
    const [value, setValue] = useState("");
    return (
      <AmountInput
        value={value}
        onChangeText={setValue}
        error="Revisa el monto"
      />
    );
  }
  await render(<Input />);
  const field = screen.getByLabelText("Monto en pesos colombianos (COP)");
  await fireEvent.changeText(field, "999999999999999,90");
  expect(field.props.value).toBe("999999999999999,90");
  expect(field.props.keyboardType).toBe("decimal-pad");
  expect(field.props.accessibilityHint).toContain("Error: Revisa el monto");
  await fireEvent.changeText(field, "0,");
  expect(field.props.value).toBe("0,");
});

test("screen focuses its title on navigation and handles native back, including a blocked save", async () => {
  jest.useFakeTimers();
  let back: (() => boolean | null | undefined) | undefined;
  const remove = jest.fn(),
    onBack = jest.fn();
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_event, handler) => {
      back = () => handler({ type: "hardwareBackPress", timeStamp: 0 });
      return { remove };
    });
  const focus = jest
    .spyOn(announcements, "focusAccessibility")
    .mockImplementation(() => {});
  const view = await render(
    <Screen title="Editar" onBack={onBack} backDisabled>
      <Text>Contenido</Text>
    </Screen>,
  );
  await act(() => {
    jest.advanceTimersByTime(20);
  });
  expect(focus).toHaveBeenCalledTimes(1);
  expect(back?.()).toBe(true);
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
  await view.rerender(
    <Screen title="Editar" onBack={onBack} focusKey="page-2">
      <Text>Otro contenido</Text>
    </Screen>,
  );
  await act(() => {
    jest.advanceTimersByTime(20);
  });
  expect(focus).toHaveBeenCalledTimes(2);
  await act(() => {
    expect(back?.()).toBe(true);
  });
  expect(onBack).toHaveBeenCalledTimes(1);
  await view.unmount();
  expect(remove).toHaveBeenCalled();
  jest.useRealTimers();
});

test("rendered feedback announces once per change, allowing the same error after clearing", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  const speak = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  const view = await render(<Feedback message="Sin conexión" tone="error" />);
  await view.rerender(<Feedback message="Sin conexión" tone="error" />);
  expect(speak).toHaveBeenCalledTimes(1);
  await view.rerender(<Feedback message="" tone="error" />);
  await view.rerender(<Feedback message="Sin conexión" tone="error" />);
  expect(speak).toHaveBeenCalledTimes(2);
});

test("deferred error focus waits until the input is enabled, then executes once", async () => {
  jest.useFakeTimers();
  const focused = jest.fn(() => {
    expect(screen.getByLabelText("Campo").props.editable).toBe(true);
  });
  function Form() {
    const [busy, setBusy] = useState(false);
    const focus = announcements.useDeferredFocus(busy);
    return (
      <>
        <FormField label="Campo" editable={!busy} />
        <AppButton
          title="Simular guardado"
          onPress={() => {
            setBusy(true);
            focus(focused);
          }}
        />
        <AppButton title="Finalizar solicitud" onPress={() => setBusy(false)} />
      </>
    );
  }
  const view = await render(<Form />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Simular guardado" }),
  );
  await act(() => {
    jest.advanceTimersByTime(20);
  });
  expect(focused).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Campo").props.editable).toBe(false);
  await fireEvent.press(
    screen.getByRole("button", { name: "Finalizar solicitud" }),
  );
  await act(() => {
    jest.advanceTimersByTime(20);
  });
  expect(focused).toHaveBeenCalledTimes(1);
  await view.unmount();
  jest.useRealTimers();
});

test.each(["android", "ios"] as const)(
  "announcement transport on %s is explicit, with queued iOS speech",
  (os) => {
    jest.replaceProperty(Platform, "OS", os);
    const normal = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const queue = jest.spyOn(
      AccessibilityInfo,
      "announceForAccessibilityWithOptions",
    );
    announcements.announce("Movimiento guardado");
    if (os === "ios")
      expect(queue).toHaveBeenCalledWith("Movimiento guardado", {
        queue: true,
      });
    else expect(normal).toHaveBeenCalledWith("Movimiento guardado");
  },
);

// WCAG relative luminance, calculated from the actual shared palette, not screenshots.
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("all palette text/button states meet 4.5:1; input borders meet 3:1", () => {
  for (const color of [
    colors.text,
    colors.muted,
    colors.error,
    colors.success,
    colors.pressed,
  ])
    expect(contrast(color, colors.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colors.muted, colors.background)).toBeGreaterThanOrEqual(3);
});
