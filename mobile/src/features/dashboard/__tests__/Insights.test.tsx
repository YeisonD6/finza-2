import React from "react";
import { render, screen } from "@testing-library/react-native";
import { CategorySpending, categoryBars } from "../components/CategorySpending";
import { monedinTip } from "../monedinTip";
import { DashboardInsights } from "../components/DashboardInsights";
import type { DashboardSummary } from "../api";
import type { Budget } from "../../budgets/components/BudgetProgress";
let mockBudgets: Budget[] = [];
let mockGoals: unknown[] = [];
jest.mock("../../goals/api", () => ({
  useGoalsQuery: () => ({
    currentData: mockGoals,
    isFetching: false,
    isError: false,
  }),
}));
jest.mock("../../budgets/api", () => ({
  useBudgetsQuery: () => ({
    currentData: { items: mockBudgets },
    isFetching: false,
    isError: false,
  }),
}));
const data: DashboardSummary = {
  month: "2026-11",
  currency: "COP",
  income: "100.00",
  expense: "10.00",
  net: "90.00",
  comparison: { reason: "comparable", delta: "20.00", percent: "28.57" },
  recent_movements: [
    {
      id: "m",
      type: "expense",
      amount: "10.00",
      currency: "COP",
      category_id: "c",
      occurred_on: "2026-11-01",
      client_request_id: "k",
      note: "",
    },
  ],
};
const budget = (status: Budget["status"], percent: string): Budget => ({
  category_id: "c",
  category_name: "Transporte",
  limit: "100.00",
  spent: "118.00",
  remaining: "-18.00",
  percent,
  status,
});
test("tip priority exceeded, warning, improving net, empty and neutral", () => {
  expect(
    monedinTip(data, [budget("warning", "80.00"), budget("exceeded", "118.00")])
      ?.message,
  ).toBe("Te pasaste $ 18 en Transporte. ¿Ajustamos el presupuesto?");
  expect(
    monedinTip(data, [{ ...budget("warning", "80.00"), remaining: "20.00" }])
      ?.message,
  ).toContain("Vas al 80,00 % de Transporte. Te quedan $ 20.");
  expect(monedinTip(data, [])?.destination).toBe("/(tabs)/goals");
  expect(
    monedinTip({ ...data, recent_movements: [] }, [
      budget("exceeded", "118.00"),
    ]),
  ).toBeNull();
  expect(monedinTip({ ...data, net: "-1.00" }, [])).toBeNull();
  expect(
    monedinTip(
      {
        ...data,
        comparison: { reason: "zero_baseline", delta: "1.00", percent: null },
      },
      [],
    ),
  ).toBeNull();
  expect(
    monedinTip(
      { ...data, comparison: { ...data.comparison, delta: "0.00" } },
      [],
    ),
  ).toBeNull();
});
test("tip tie breaks deterministically without mutating budgets", () => {
  const items = [
    {
      ...budget("exceeded", "120.00"),
      category_id: "z",
      category_name: "Servicios",
    },
    { ...budget("exceeded", "120.00"), category_id: "a" },
  ];
  expect(monedinTip(data, items)?.message).toContain("Transporte");
  expect(items[0].category_id).toBe("z");
});
const expenses = [
  {
    category_id: "a",
    name: "Alimentación",
    total: "620000.00",
    share_percent: "66.67",
  },
  {
    category_id: "b",
    name: "Transporte",
    total: "310000.00",
    share_percent: "33.33",
  },
];
test("category chart gives visible exact amounts, shares, summary and shared scale", async () => {
  await render(<CategorySpending items={[expenses[1], expenses[0]]} />);
  expect(screen.getByText("$ 620.000 · 66,67 %")).toBeTruthy();
  expect(screen.getByText("$ 310.000 · 33,33 %")).toBeTruthy();
  expect(
    screen.getByLabelText(
      /Gasto por categoría: Alimentación 620.000 pesos, 66,67 por ciento; Transporte/,
    ),
  ).toBeTruthy();
  expect(
    screen.getByTestId("category-bar-a", { includeHiddenElements: true }).props
      .width,
  ).toBe(100);
  expect(
    screen.getByTestId("category-bar-b", { includeHiddenElements: true }).props
      .width,
  ).toBe(50);
  expect(
    categoryBars([
      { ...expenses[0], total: "999999999999999.99" },
      { ...expenses[1], total: "499999999999999.99" },
    ])[1].width,
  ).toBe(49.99);
});
test("empty expenses hide the chart; budgets show three largest with textual status", async () => {
  mockBudgets = [
    budget("on_track", "20.00"),
    { ...budget("warning", "90.00"), category_id: "b" },
    { ...budget("exceeded", "120.00"), category_id: "d" },
    { ...budget("on_track", "10.00"), category_id: "e" },
  ];
  await render(<DashboardInsights data={data} categories={[]} />);
  expect(screen.getAllByRole("progressbar")).toHaveLength(3);
  expect(screen.queryByText("Gasto por categoría")).toBeNull();
  expect(screen.getByText(/Transporte: Excedido por/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Ver todos los presupuestos" }),
  ).toBeTruthy();
});
