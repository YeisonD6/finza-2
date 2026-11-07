import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { MovementsScreen } from "../MovementsScreen";

const mockArchive = jest.fn((_id: string) => ({ unwrap: async () => {} }));
let mockFailed = false;
let mockDuplicates = false;
let mockPaged = false;
const mockRetry = jest.fn();
jest.mock("expo-crypto", () => ({ randomUUID: () => "key" }));
jest.mock("../api", () => ({
  useCategoriesQuery: () => ({ data: [] }),
  useMovementsQuery: (filters: { cursor?: string }) => ({
    error: mockFailed ? { status: 503 } : undefined,
    currentData: {
      items: [
        {
          id: "m",
          type: "expense",
          amount: "10.00",
          currency: "COP",
          occurred_on: "2024-02-29",
          note: "Compra",
          category_id: "cat",
        },
      ].flatMap((row) =>
        mockDuplicates || (mockPaged && filters.cursor)
          ? [row, { ...row, id: "second" }]
          : [row],
      ),
      next_cursor: mockPaged && !filters.cursor ? "next" : null,
    },
    refetch: mockRetry,
  }),
  useArchiveMovementMutation: () => [mockArchive],
}));

beforeEach(() => {
  mockFailed = false;
  mockDuplicates = false;
  mockPaged = false;
  jest.clearAllMocks();
});

test("duplicate amounts and dates still have uniquely named edit/archive actions", async () => {
  mockDuplicates = true;
  await render(<MovementsScreen onEdit={() => {}} />);
  const names = screen
    .getAllByRole("button")
    .map((button) => button.props.accessibilityLabel);
  expect(new Set(names).size).toBe(names.length);
  expect(
    screen.getByRole("button", {
      name: /Editar Gasto.*Movimiento 2/,
    }).props.accessibilityActions,
  ).toEqual([{ name: "archive", label: "Archivar" }]);
  expect(screen.queryByRole("button", { name: /^Archivar/ })).toBeNull();
});

test("a failed refresh hides stale financial rows and offers retry", async () => {
  mockFailed = true;
  await render(<MovementsScreen onEdit={() => {}} />);
  expect(
    screen.queryByRole("button", { name: /Archivar movimiento/ }),
  ).toBeNull();
  expect(screen.queryByText("Compra")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Reintentar movimientos" }),
  );
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

test("month validation associates the error with its field and retains the selection", async () => {
  await render(<MovementsScreen onEdit={() => {}} />);
  await fireEvent.press(
    screen.getByRole("button", { name: /^Mes: .*Toca para elegir otro mes$/ }),
  );
  await fireEvent.changeText(screen.getByLabelText("Mes (YYYY-MM)"), "2024-13");
  await fireEvent.press(screen.getByRole("button", { name: "Aplicar mes" }));
  const field = screen.getByLabelText("Mes (YYYY-MM)");
  expect(field.props.value).toBe("2024-13");
  expect(field.props.accessibilityHint).toContain(
    "Error: Ingresa un mes válido",
  );
});

test("archive requires confirmation and reports success", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(<MovementsScreen onEdit={() => {}} />);
  await fireEvent(
    screen.getByRole("button", { name: /Editar Gasto/ }),
    "accessibilityAction",
    { nativeEvent: { actionName: "archive" } },
  );
  expect(mockArchive.mock.calls).toHaveLength(0);
  const confirm = alert.mock.calls[0][2]!.find((b) => b.text === "Archivar")!;
  await act(async () => {
    await confirm.onPress?.();
  });
  expect(await screen.findByText("Movimiento archivado")).toBeTruthy();
  expect(mockArchive.mock.calls[0][0]).toBe("m");
  alert.mockRestore();
});

test("cursor loading appends unique rows and a later failure hides every loaded page", async () => {
  mockPaged = true;
  const view = await render(<MovementsScreen onEdit={() => {}} />);
  expect(screen.getAllByRole("button", { name: /Editar Gasto/ })).toHaveLength(
    1,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Cargar más" }));
  expect(screen.getAllByRole("button", { name: /Editar Gasto/ })).toHaveLength(
    2,
  );
  expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
  mockFailed = true;
  await view.rerender(<MovementsScreen onEdit={() => {}} />);
  expect(screen.queryByRole("button", { name: /Editar Gasto/ })).toBeNull();
  expect(screen.queryByText("Compra")).toBeNull();
});
