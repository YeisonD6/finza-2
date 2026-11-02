jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "test-key" }));
import React from "react";
import { Provider } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { FinancialHome } from "../FinancialHome";
import { store } from "../../../core/store";
import { baseApi } from "../../../shared/api/baseApi";
import { auth } from "../../auth/runtime";
import * as announcements from "../../../shared/accessibility/announcements";
import type { Movement } from "../../movements/types";

beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  store.dispatch(baseApi.util.resetApiState());
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("dashboard → real movement form → save → dashboard of accounting month with invalidated cache", async () => {
  const speech = jest.spyOn(announcements, "announce");
  let saved: Movement | undefined;
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (init?.method === "POST") {
        saved = { ...JSON.parse(init.body as string), id: "saved-movement" };
        return saved;
      }
      if (path.startsWith("/api/v1/categories"))
        return [
          {
            id: "expense-cat",
            name: "Alimentación",
            movement_type: "expense",
            is_system: true,
          },
        ];
      if (path.startsWith("/api/v1/movements"))
        return { items: [], next_cursor: null, month: "2024-02" };
      return {
        month: new URL("http://test" + path).searchParams.get("month"),
        currency: "COP",
        income: "0.00",
        expense: saved?.amount ?? "0.00",
        net: saved ? "-" + saved.amount : "0.00",
        comparison: { reason: "no_previous_data", delta: null, percent: null },
        recent_movements: saved ? [saved] : [],
      };
    });
  try {
    await render(
      <Provider store={store}>
        <FinancialHome
          email="a@example.com"
          onLogout={() => {}}
          logoutBusy={false}
        />
      </Provider>,
    );
    await screen.findByText(/Registra tu primer movimiento/);
    // Prime this month's cache before writing so the return must refetch it.
    await fireEvent.changeText(
      screen.getByLabelText("Mes del dashboard (YYYY-MM)"),
      "2024-02",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Consultar mes" }),
    );
    await screen.findByText("Resumen de 2024-02 en COP");
    await fireEvent.press(
      screen.getByRole("button", { name: "Registrar movimiento" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Monto en pesos colombianos (COP)"),
      "1234,50",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Fecha contable (YYYY-MM-DD)"),
      "2024-02-29",
    );
    await fireEvent.press(
      await screen.findByRole("button", { name: "Alimentación" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Guardar movimiento" }),
    );
    expect(
      await screen.findByText("Flujo neto del mes: $ -1.234,50 COP"),
    ).toBeTruthy();
    expect(screen.getByText("Resumen de 2024-02 en COP")).toBeTruthy();
    expect(saved?.amount).toBe("1234.50");
    expect(
      speech.mock.calls.filter(
        ([message]) => message === "Movimiento guardado",
      ),
    ).toHaveLength(1);
    expect(screen.getByText("Movimiento guardado.")).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Ver movimientos" }),
    );
    await fireEvent.press(
      await screen.findByRole("button", { name: "Volver al dashboard" }),
    );
    expect(
      await screen.findByRole("header", { name: "Dashboard financiero" }),
    ).toBeTruthy();
  } finally {
    store.dispatch(baseApi.util.resetApiState());
    request.mockRestore();
    speech.mockRestore();
  }
});
