import React from "react";
import * as announcements from "../../../shared/accessibility/announcements";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DashboardScreen } from "../DashboardScreen";
import type { DashboardSummary } from "../api";

const mockRefetch = jest.fn();
let mockQuery: {
  currentData?: DashboardSummary;
  data?: DashboardSummary;
  isFetching: boolean;
  isError: boolean;
  refetch: typeof mockRefetch;
};
jest.mock("../api", () => ({ useDashboardQuery: () => mockQuery }));
const fixture = (
  changes: Partial<DashboardSummary> = {},
): DashboardSummary => ({
  month: "2024-02",
  currency: "COP",
  income: "1000.00",
  expense: "1250.00",
  net: "-250.00",
  comparison: { delta: "-750.00", percent: "-150.00", reason: "comparable" },
  recent_movements: [
    {
      id: "m",
      type: "expense",
      amount: "1250.00",
      currency: "COP",
      occurred_on: "2024-02-29",
      category_id: "c",
      note: "Compra",
      client_request_id: "key",
    },
  ],
  ...changes,
});
const props = {
  month: "2024-02",
  email: "a@example.com",
  logoutBusy: false,
  onMonthChange: jest.fn(),
  onRegister: jest.fn(),
  onOpenMovements: jest.fn(),
  onLogout: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {
    currentData: fixture(),
    isFetching: false,
    isError: false,
    refetch: mockRefetch,
  };
});

test("readable financial summary, negative flow, comparison and actions", async () => {
  const announcement = jest.spyOn(announcements, "announce");
  await render(<DashboardScreen {...props} />);
  expect(
    screen.getByRole("header", { name: "Dashboard financiero" }),
  ).toBeTruthy();
  expect(screen.getByText("Ingresos: $ 1.000,00 COP")).toBeTruthy();
  expect(screen.getByText("Gastos: $ 1.250,00 COP")).toBeTruthy();
  expect(screen.getByText("Flujo neto del mes: $ -250,00 COP")).toBeTruthy();
  expect(screen.getByText(/Flujo negativo: los gastos superan/)).toBeTruthy();
  expect(
    screen.getByText("Disminución del flujo neto: $ -750,00 COP"),
  ).toBeTruthy();
  expect(screen.getByText("Variación del flujo neto: -150,00%")).toBeTruthy();
  expect(screen.getByText(/mes calendario completo anterior/)).toBeTruthy();
  expect(screen.getByText("Fecha contable: 2024-02-29")).toBeTruthy();
  expect(announcement).toHaveBeenCalledWith(
    expect.stringContaining("$ -250,00 COP"),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Registrar movimiento" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Ver movimientos" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(props.onRegister).toHaveBeenCalledTimes(1);
  expect(props.onOpenMovements).toHaveBeenCalledTimes(1);
  expect(props.onLogout).toHaveBeenCalledTimes(1);
});

test.each([
  ["no_previous_data", null, /No hay datos para comparar/],
  ["zero_baseline", "750.00", /El flujo anterior fue cero/],
  ["negative_baseline", "850.00", /El flujo anterior fue negativo/],
] as const)(
  "baseline %s is explained without inventing a percentage",
  async (reason, delta, message) => {
    mockQuery.currentData = fixture({
      comparison: { reason, delta, percent: null },
    });
    await render(<DashboardScreen {...props} />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(/Variación del flujo neto:/)).toBeNull();
    if (delta)
      expect(
        screen.getByText(
          `Aumento del flujo neto: $ ${delta.replace(".", ",")} COP`,
        ),
      ).toBeTruthy();
  },
);

test("empty month shows explicit zero totals and an actionable empty state", async () => {
  mockQuery.currentData = fixture({
    income: "0.00",
    expense: "0.00",
    net: "0.00",
    recent_movements: [],
    comparison: { delta: null, percent: null, reason: "no_previous_data" },
  });
  await render(<DashboardScreen {...props} />);
  expect(screen.getByText("Flujo neto del mes: $ 0,00 COP")).toBeTruthy();
  expect(screen.getByText(/Registra tu primer movimiento/)).toBeTruthy();
  expect(screen.queryByText(/Flujo negativo:/)).toBeNull();
});

test("month errors keep the field and valid selection calls the parent", async () => {
  await render(<DashboardScreen {...props} />);
  const field = screen.getByLabelText("Mes del dashboard (YYYY-MM)");
  await fireEvent.changeText(field, "2024-13");
  await fireEvent.press(screen.getByRole("button", { name: "Consultar mes" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(props.onMonthChange).not.toHaveBeenCalled();
  expect(field.props.value).toBe("2024-13");
  await fireEvent.changeText(field, "2024-03");
  await fireEvent.press(screen.getByRole("button", { name: "Consultar mes" }));
  expect(props.onMonthChange).toHaveBeenCalledWith("2024-03");
});

test("loading a new month never presents data from the preceding query", async () => {
  mockQuery = {
    ...mockQuery,
    data: fixture(),
    currentData: undefined,
    isFetching: true,
  };
  await render(<DashboardScreen {...props} month="2024-03" />);
  expect(screen.getByText("Cargando dashboard…")).toBeTruthy();
  expect(screen.queryByText(/Flujo neto del mes:/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "Actualizar dashboard" }),
  ).toBeDisabled();
});

test("refresh error hides stale data and exposes a retry", async () => {
  mockQuery.isError = true;
  await render(<DashboardScreen {...props} />);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText(/Flujo neto del mes:/)).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Reintentar dashboard" }),
  );
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

test("large decimal strings are displayed exactly without Number conversion", async () => {
  mockQuery.currentData = fixture({
    income: "1999999999999999.98",
    net: "1999999999999999.68",
    expense: "0.30",
  });
  await render(<DashboardScreen {...props} />);
  expect(
    screen.getByText("Ingresos: $ 1.999.999.999.999.999,98 COP"),
  ).toBeTruthy();
  expect(
    screen.getByText("Flujo neto del mes: $ 1.999.999.999.999.999,68 COP"),
  ).toBeTruthy();
});
