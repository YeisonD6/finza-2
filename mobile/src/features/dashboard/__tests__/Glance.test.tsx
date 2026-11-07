import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { spentShare } from "../components/SummaryHeader";
import { QuickActions } from "../components/QuickActions";
import { GoalsGlance } from "../components/GoalsGlance";

let mockGoals: unknown = [];
jest.mock("../../goals/api", () => ({
  useGoalsQuery: () => ({
    currentData: mockGoals,
    isFetching: false,
    isError: false,
  }),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
}));

const goal = (
  id: string,
  name: string,
  percent: string,
  status = "active",
) => ({
  id,
  name,
  target_amount: "1000.00",
  saved_amount: "400.00",
  remaining: "600.00",
  percent,
  target_date: null,
  status,
  currency: "COP",
  created_at: "2026-11-01T00:00:00Z",
});

beforeEach(() => jest.clearAllMocks());

test("spent share is exact, rounded and absent without income", () => {
  expect(spentShare("3650000.00", "1873600.00")).toBe(51);
  expect(spentShare("100.00", "125.00")).toBe(125);
  expect(spentShare("0.00", "50.00")).toBeNull();
  expect(spentShare("999999999999999.99", "333333333333333.33")).toBe(33);
});

test("quick actions are labelled buttons with hints that call their handlers", async () => {
  const handlers = {
    onRegister: jest.fn(),
    onBudgets: jest.fn(),
    onNewGoal: jest.fn(),
  };
  await render(<QuickActions {...handlers} />);
  for (const [name, handler] of [
    ["Registrar", handlers.onRegister],
    ["Presupuestos", handlers.onBudgets],
    ["Nueva meta", handlers.onNewGoal],
  ] as const) {
    const button = screen.getByRole("button", { name });
    expect(button.props.accessibilityHint).toBeTruthy();
    await fireEvent.press(button);
    expect(handler).toHaveBeenCalledTimes(1);
  }
});

test("goals glance shows the two active goals closest to completion", async () => {
  mockGoals = [
    goal("a", "Bicicleta", "10.00"),
    goal("b", "Viaje", "65.50"),
    goal("c", "Fondo", "40.00"),
    goal("d", "Portátil", "100.00", "completed"),
  ];
  await render(<GoalsGlance />);
  const buttons = screen.getAllByRole("button", { name: /por ciento$/ });
  expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual([
    "Viaje: $ 400 de $ 1.000, 65,50 por ciento",
    "Fondo: $ 400 de $ 1.000, 40 por ciento",
  ]);
  await fireEvent.press(buttons[0]);
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/goal/[id]",
    params: { id: "b" },
  });
});

test("goals glance invites to create a goal when none is active", async () => {
  mockGoals = [];
  await render(<GoalsGlance />);
  await fireEvent.press(
    screen.getByRole("button", { name: "Crea tu primera meta de ahorro" }),
  );
  expect(router.push).toHaveBeenCalledWith("/goal/new");
});
