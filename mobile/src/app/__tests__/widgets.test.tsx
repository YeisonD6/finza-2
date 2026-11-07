import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import {
  cleanup,
  fireEvent,
  renderRouter,
  screen,
} from "expo-router/testing-library";
import Widgets from "../widgets";
import { authSlice } from "../../features/auth/state";

let mockAvailable = false;
const mockSetHide = jest.fn();
jest.mock("../../features/widgets/native", () => ({
  get widgetsAvailable() {
    return mockAvailable;
  },
  getHideAmounts: () => false,
  setHideAmounts: (hidden: boolean) => mockSetHide(hidden),
}));

let mockSummary:
  | { month: string; net: string; income: string; expense: string }
  | undefined;
jest.mock("../../features/dashboard/api", () => ({
  useDashboardQuery: () => ({ currentData: mockSummary }),
}));

async function open() {
  const store = configureStore({ reducer: { auth: authSlice.reducer } });
  store.dispatch(
    authSlice.actions.changed({
      loading: false,
      profile: { id: "p", email: "p@example.com", base_currency: "COP" },
    }),
  );
  await renderRouter(
    {
      widgets: () => (
        <Provider store={store}>
          <Widgets />
        </Provider>
      ),
      "(auth)/login": () => null,
    },
    { initialUrl: "/widgets" },
  );
}

afterEach(() => {
  mockSummary = undefined;
  cleanup();
  jest.clearAllMocks();
});

test("explains that widgets need the installed app and disables the privacy switch", async () => {
  mockAvailable = false;
  await open();
  expect(screen.getByText(/funcionan en la app instalada/)).toBeTruthy();
  expect(
    screen.getByRole("switch", { name: "Ocultar montos en los widgets" }),
  ).toBeDisabled();
});

test("hiding amounts is saved for the widgets", async () => {
  mockAvailable = true;
  await open();
  expect(screen.queryByText(/funcionan en la app instalada/)).toBeNull();
  const toggle = screen.getByRole("switch", {
    name: "Ocultar montos en los widgets",
  });
  await fireEvent(toggle, "valueChange", true);
  expect(mockSetHide).toHaveBeenCalledWith(true);
  // The section copy promises no session data leaves the app.
  expect(screen.getByText(/No guardan tu correo, tu contraseña ni tu sesión/)).toBeTruthy();
});

test("the preview mirrors the summary widget and the privacy setting", async () => {
  mockAvailable = true;
  mockSummary = {
    month: "2026-11",
    net: "1776400.00",
    income: "3650000.00",
    expense: "1873600.00",
  };
  await open();
  expect(screen.getByLabelText("Vista previa del widget Resumen del mes")).toBeTruthy();
  expect(screen.getByText("+$ 1.776.400")).toBeTruthy();
  await fireEvent(
    screen.getByRole("switch", { name: "Ocultar montos en los widgets" }),
    "valueChange",
    true,
  );
  expect(screen.queryByText("+$ 1.776.400")).toBeNull();
  expect(
    screen.getByLabelText(/Vista previa del widget Resumen del mes, con montos ocultos/),
  ).toBeTruthy();
});
