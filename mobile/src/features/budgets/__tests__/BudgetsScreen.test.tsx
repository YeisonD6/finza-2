import React from "react";
import { Alert, TextInput } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { BudgetsScreen } from "../BudgetsScreen";
import { BudgetEditor } from "../components/BudgetEditor";
const mockSave = jest.fn(),
  mockRemove = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  usePreventRemove: () => jest.fn(),
}));
jest.mock("../api", () => ({
  useBudgetsQuery: () => ({
    currentData: {
      items: [
        {
          category_id: "c",
          category_name: "Transporte",
          limit: "100.00",
          spent: "118.00",
          remaining: "-18.00",
          percent: "118.00",
          status: "exceeded",
        },
      ],
    },
  }),
  useUpsertBudgetMutation: () => [mockSave],
  useDeleteBudgetMutation: () => [mockRemove],
}));
jest.mock("../../movements/api", () => ({
  useCategoriesQuery: () => ({
    currentData: [
      { id: "c", name: "Transporte", movement_type: "expense" },
      { id: "a", name: "Alimentación", movement_type: "expense" },
      { id: "i", name: "Salario", movement_type: "income" },
    ],
  }),
}));
beforeEach(() => jest.clearAllMocks());
test("budgets list, recurring limits and define only remaining expense categories", async () => {
  await render(<BudgetsScreen />);
  expect(
    screen.getByText("Límites mensuales que se repiten cada mes."),
  ).toBeTruthy();
  expect(screen.getByText("Transporte: Excedido por $ 18")).toBeTruthy();
  expect(screen.queryByText("Salario")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Definir presupuesto de Alimentación" }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/budgets/[categoryId]",
    params: { categoryId: "a" },
  });
});
test("canonical save and native removal require explicit confirmation", async () => {
  mockSave.mockReturnValue({ unwrap: async () => ({}) });
  mockRemove.mockReturnValue({ unwrap: async () => undefined });
  const close = jest.fn(),
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(
    <BudgetEditor
      categoryId="c"
      name="Transporte"
      limit="100.00"
      onClose={close}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText("Monto"), "150,50");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(mockSave).toHaveBeenCalledWith({
    categoryId: "c",
    body: { amount: "150.50", currency: "COP" },
  });
  await fireEvent.press(
    screen.getByRole("button", { name: "Quitar presupuesto" }),
  );
  expect(mockRemove).not.toHaveBeenCalled();
  await act(async () => {
    alert.mock.calls[0][2]?.[1].onPress?.();
  });
  expect(mockRemove).toHaveBeenCalledWith("c");
  alert.mockRestore();
});
test("server field error is associated, announced and focused; amount is preserved", async () => {
  const focus = jest
    .spyOn(TextInput.prototype, "focus")
    .mockImplementation(() => {});
  mockSave.mockReturnValue({
    unwrap: async () => {
      throw {
        data: {
          message: "Revisa el monto",
          field_errors: { amount: "Monto inválido" },
        },
      };
    },
  });
  await render(
    <BudgetEditor categoryId="c" name="Transporte" onClose={() => {}} />,
  );
  await fireEvent.changeText(screen.getByLabelText("Monto"), "123,45");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
  expect(screen.getByLabelText("Monto").props.accessibilityHint).toContain(
    "Monto inválido",
  );
  expect(screen.getByLabelText("Monto").props.value).toBe("123,45");
  await waitFor(() => expect(focus).toHaveBeenCalled());
  focus.mockRestore();
});
