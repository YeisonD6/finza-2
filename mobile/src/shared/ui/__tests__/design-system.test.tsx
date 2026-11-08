import React from "react";
import { AccessibilityInfo, Platform, StyleSheet } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AmountText } from "../AmountText";
import { SproutProgress } from "../SproutProgress";
import { MonthSwitcher } from "../MonthSwitcher";
import { TabBar } from "../TabBar";
import { Monedin } from "../../brand/Monedin";
import { AppText } from "../AppText";
import { useReducedMotion } from "../../theme/motion";
import { formatCOP } from "../../formatting/money";
import { MovementRow } from "../MovementRow";
import { AmountField } from "../AmountField";
import { colors } from "../../theme/tokens";
import { bogotaToday } from "../../../features/movements/domain";
import { shiftMonth, monthLabel } from "../../formatting/dates";
afterEach(() => {
  jest.restoreAllMocks();
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
});
test.each([
  ["1234.50", "neutral", "$ 1.234,50", "Monto de $ 1.234,50 pesos colombianos"],
  [
    "1234.00",
    "income",
    "+$ 1.234",
    "Ingreso de más $ 1.234,00 pesos colombianos",
  ],
  ["86.40", "expense", "−$ 86,40", "Gasto de menos $ 86,40 pesos colombianos"],
  [
    "-999999999999999.99",
    "auto",
    "−$ 999.999.999.999.999,99",
    "Gasto de menos $ 999.999.999.999.999,99 pesos colombianos",
  ],
] as const)(
  "COP %s has exact format, sign, tone and spoken meaning",
  async (value, tone, text, label) => {
    await render(<AmountText value={value} tone={tone} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.getByText(text)).toHaveStyle({
      fontVariant: ["tabular-nums"],
    });
  },
);
test.each([
  [0, "Al día", colors.progress],
  [79, "Al día", colors.progress],
  [80, "Cerca del límite", colors.warning],
  [100, "Cerca del límite", colors.warning],
  [125, "Excedido", colors.expense],
] as const)(
  "progress %s has bounded value and explicit status",
  async (value, text, color) => {
    await render(<SproutProgress value={value} />);
    const progress = screen.getByRole("progressbar");
    expect(progress.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: Math.min(value, 100),
      text: `${value} %. ${text}`,
    });
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByTestId("sprout-progress-fill")).toHaveStyle({
      backgroundColor: color,
    });
  },
);
test("month picker bounds calendar navigation and rejects future direct entry without losing input", async () => {
  const change = jest.fn();
  const month = bogotaToday().slice(0, 7);
  const view = await render(<MonthSwitcher month={month} onChange={change} />);
  expect(
    screen.getByRole("button", {
      name: `Mes siguiente: ${monthLabel(shiftMonth(month, 1))}`,
    }),
  ).toBeDisabled();
  await fireEvent.press(
    screen.getByRole("button", {
      name: `Mes anterior: ${monthLabel(shiftMonth(month, -1))}`,
    }),
  );
  expect(change).toHaveBeenCalledWith(shiftMonth(month, -1));
  await view.rerender(<MonthSwitcher month="1900-01" onChange={change} />);
  expect(
    screen.getByRole("button", { name: "Mes anterior: diciembre 1899" }),
  ).toBeDisabled();
  await fireEvent.press(
    screen.getByRole("button", { name: /^Mes: .*Toca para elegir otro mes$/ }),
  );
  await fireEvent.changeText(screen.getByLabelText("Mes (YYYY-MM)"), "9998-12");
  await fireEvent.press(screen.getByRole("button", { name: "Aplicar mes" }));
  expect(screen.getByLabelText("Mes (YYYY-MM)").props.value).toBe("9998-12");
  expect(
    screen.getByLabelText("Mes (YYYY-MM)").props.accessibilityHint,
  ).toContain("Error:");
  expect(change).toHaveBeenCalledTimes(1);
});
test("tab semantics have one selected tab and central registration is an independent button", async () => {
  const tab = jest.fn(),
    add = jest.fn();
  await render(
    <SafeAreaInsetsContext.Provider
      value={{ top: 0, bottom: 0, left: 0, right: 0 }}
    >
      <TabBar active="movements" onTab={tab} onRegister={add} />
    </SafeAreaInsetsContext.Provider>,
  );
  expect(screen.getAllByRole("tab")).toHaveLength(4);
  expect(screen.getAllByRole("tab", { selected: true })).toHaveLength(1);
  expect(
    screen.getByRole("tab", { name: "Movimientos" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(
    screen.getByRole("tab", { name: "Inicio" }).props.accessibilityState
      .selected,
  ).toBe(false);
  const plus = screen.getByRole("button", { name: "Registrar movimiento" });
  expect(plus).toHaveStyle({ minHeight: 52, minWidth: 48 });
  await fireEvent.press(plus);
  await fireEvent.press(screen.getByRole("tab", { name: "Metas" }));
  expect(add).toHaveBeenCalledTimes(1);
  expect(tab).toHaveBeenCalledWith("goals");
});
test("reduced motion is static, reacts to preference changes and cleans up its listener", async () => {
  let change: (value: boolean) => void = () => {};
  const remove = jest.fn();
  const listener = jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation((event, callback) => {
      if (event === "reduceMotionChanged")
        change = callback as (value: boolean) => void;
      return { remove };
    });
  const { withRepeat } = require("react-native-reanimated");
  withRepeat.mockClear();
  const lids = () =>
    screen.queryAllByTestId("monedin-lid", { includeHiddenElements: true });
  const view = await render(<Monedin motion="idle" />);
  expect(withRepeat).not.toHaveBeenCalled();
  expect(lids()).toHaveLength(0);
  await act(() => change(false));
  await waitFor(() => expect(withRepeat).toHaveBeenCalledTimes(1));
  expect(lids()).toHaveLength(2);
  await act(() => change(true));
  expect(lids()).toHaveLength(0);
  await view.unmount();
  expect(remove).toHaveBeenCalled();
  listener.mockRestore();
});
test("a late initial motion query cannot overwrite a newer system event", async () => {
  let resolve!: (value: boolean) => void;
  let change!: (value: boolean) => void;
  const remove = jest.fn();
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation((_event, cb) => {
      change = cb as (value: boolean) => void;
      return { remove };
    });
  function Preference() {
    return <AppText>{useReducedMotion() ? "reducido" : "normal"}</AppText>;
  }
  await render(<Preference />);
  await act(() => change(true));
  await act(() => resolve(false));
  expect(screen.getByText("reducido")).toBeTruthy();
});

test.each([
  ["-18500.00", "−$ 18.500"],
  ["18500.00", "$ 18.500"],
  ["-1234.50", "−$ 1.234,50"],
  ["-999999999999999.99", "−$ 999.999.999.999.999,99"],
  ["0.00", "$ 0"],
])(
  "formatCOP %s places a typographic minus before the currency",
  (value, expected) => {
    expect(formatCOP(value)).toBe(expected);
  },
);
test("amount entry has one inline suffix, a short label and associated help and errors", async () => {
  await render(<AmountField value="0," error="Revisa el monto" />);
  expect(screen.getByText("Monto")).toBeTruthy();
  expect(screen.getAllByText("COP")).toHaveLength(1);
  expect(screen.getByText("Usa coma para decimales.")).toBeTruthy();
  const input = screen.getByLabelText("Monto");
  expect(input.props.value).toBe("0,");
  expect(input.props.placeholder).toBe("0");
  expect(input.props.accessibilityHint).toContain("Error: Revisa el monto");
});

test.each([1, 2])(
  "tabs retain whole labels and central action at font scale %s",
  async (fontScale) => {
    const dimensions = jest
      .spyOn(require("react-native"), "useWindowDimensions")
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale });
    await render(
      <SafeAreaInsetsContext.Provider
        value={{ top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <TabBar active="movements" onTab={() => {}} onRegister={() => {}} />
      </SafeAreaInsetsContext.Provider>,
    );
    const label = screen.getByText("Movimientos");
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.85);
    expect(label).toHaveStyle({
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      color: colors.forest700,
    });
    expect(
      screen.getByRole("button", { name: "Registrar movimiento" }),
    ).toHaveStyle({ width: 48, height: 48 });
    dimensions.mockRestore();
  },
);
test.each([1, 2])(
  "movement amount stays whole and aligns for font scale %s",
  async (fontScale) => {
    const dimensions = jest
      .spyOn(require("react-native"), "useWindowDimensions")
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale });
    await render(
      <MovementRow
        movement={{
          id: "m",
          amount: "18500.00",
          type: "expense",
          currency: "COP",
          occurred_on: "2026-11-07",
          category_id: "c",
          client_request_id: "r",
          note: "Almuerzo",
        }}
        category="Alimentación"
        onPress={() => {}}
      />,
    );
    const amount = screen.getByText("−$ 18.500");
    expect(amount).toHaveStyle({
      textAlign: fontScale === 2 ? "left" : "right",
      flexShrink: 0,
    });
    expect(amount.props.numberOfLines).toBeUndefined();
    expect(screen.getByText("Almuerzo")).toHaveStyle({ fontSize: 13 });
    dimensions.mockRestore();
  },
);
