import React from "react";
import { AccessibilityInfo, Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { applyColorScheme, colors } from "../../theme/tokens";
import { GlassSurface, glassStyle } from "../GlassSurface";
import { LiquidBackdrop } from "../LiquidBackdrop";

afterEach(async () => {
  await act(() => applyColorScheme("light"));
  jest.restoreAllMocks();
});

test("glass follows theme changes without hiding or remounting its content", async () => {
  await render(
    <GlassSurface testID="surface">
      <Text accessibilityRole="header">Tus cuentas</Text>
    </GlassSurface>,
  );
  const heading = screen.getByRole("header", { name: "Tus cuentas" });
  await act(() => applyColorScheme("dark"));
  expect(screen.getByTestId("surface")).toHaveStyle({
    backgroundColor: colors.glassStrong,
    borderColor: colors.glassBorder,
  });
  expect(glassStyle.backgroundColor).toBe(colors.glassStrong);
  expect(screen.getByRole("header", { name: "Tus cuentas" })).toBe(heading);
});

test("reduce transparency makes glass opaque while retaining accessible content", async () => {
  jest
    .spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
    .mockResolvedValue(true);
  await render(
    <GlassSurface testID="surface">
      <Text>Saldo disponible</Text>
    </GlassSurface>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("surface")).toHaveStyle({
      backgroundColor: colors.surface,
    }),
  );
  expect(screen.getByText("Saldo disponible")).toBeTruthy();
});

test("the liquid backdrop is decorative and cannot receive touches", async () => {
  const view = await render(<LiquidBackdrop active={false} />);
  const backdrop = view.toJSON();
  expect(backdrop).toMatchObject({
    props: {
      pointerEvents: "none",
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    },
  });
});
