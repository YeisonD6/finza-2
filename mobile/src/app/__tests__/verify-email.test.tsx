import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { router } from "expo-router";
import {
  act,
  cleanup,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import VerifyEmail from "../verify-email";
import { authSlice } from "../../features/auth/state";

jest.mock("../../features/auth/runtime", () => ({
  auth: { verifyEmail: jest.fn() },
}));
import { auth } from "../../features/auth/runtime";

function sessionStore(signedIn = false) {
  const store = configureStore({ reducer: { auth: authSlice.reducer } });
  store.dispatch(
    authSlice.actions.changed({
      loading: false,
      profile: signedIn
        ? { id: "persona", email: "persona@example.com", base_currency: "COP" }
        : null,
    }),
  );
  return store;
}

async function openLink(token?: string, signedIn = false) {
  const store = sessionStore(signedIn);
  const view = await renderRouter(
    {
      "verify-email": () => (
        <Provider store={store}>
          <VerifyEmail />
        </Provider>
      ),
      "(auth)/login": () => null,
      "(tabs)/index": () => null,
    },
    { initialUrl: token ? `/verify-email?token=${token}` : "/verify-email" },
  );
  return { store, view };
}

beforeEach(() => {
  jest.mocked(auth.verifyEmail).mockReset();
  jest.mocked(auth.verifyEmail).mockResolvedValue(undefined);
});
afterEach(async () => {
  await cleanup();
});

test("sin token muestra el enlace incompleto y no llama a la API", async () => {
  await openLink();
  expect(
    await screen.findByRole("header", { name: "No pudimos confirmarlo" }),
  ).toBeTruthy();
  expect(
    screen.getByText("El enlace está incompleto. Pide uno nuevo desde FINZA."),
  ).toBeTruthy();
  expect(auth.verifyEmail).not.toHaveBeenCalled();
});

test.each([
  { signedIn: false, label: "Iniciar sesión", pathname: "/login" },
  { signedIn: true, label: "Ir al inicio", pathname: "/" },
])(
  "confirma el correo y ofrece $label según la sesión",
  async ({ signedIn, label, pathname }) => {
    await openLink("token-de-confirmacion", signedIn);
    expect(
      await screen.findByRole("header", { name: "Correo confirmado" }),
    ).toBeTruthy();
    expect(auth.verifyEmail).toHaveBeenCalledTimes(1);
    expect(auth.verifyEmail).toHaveBeenCalledWith("token-de-confirmacion");
    await fireEvent.press(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(screen).toHavePathname(pathname));
  },
);

test("muestra el estado fallido y el mensaje que devuelve la API", async () => {
  const message =
    "El enlace no es válido o ya venció. Pide uno nuevo desde FINZA.";
  jest.mocked(auth.verifyEmail).mockRejectedValue(new Error(message));
  await openLink("token-vencido");
  expect(
    await screen.findByRole("header", { name: "No pudimos confirmarlo" }),
  ).toBeTruthy();
  expect(screen.getByText(message)).toBeTruthy();
  expect(auth.verifyEmail).toHaveBeenCalledTimes(1);
});

test("verifica una sola vez aunque cambien los parámetros y se renderice de nuevo", async () => {
  let finish!: () => void;
  jest.mocked(auth.verifyEmail).mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const { store } = await openLink("token-original");
  expect(
    screen.getByRole("header", { name: "Confirmando tu correo" }),
  ).toBeTruthy();
  await act(() => router.setParams({ token: "otro-token" }));
  await waitFor(() =>
    expect(screen).toHaveSearchParams({ token: "otro-token" }),
  );
  expect(auth.verifyEmail).toHaveBeenCalledTimes(1);
  await act(() => finish());
  await screen.findByRole("header", { name: "Correo confirmado" });
  await act(() => {
    store.dispatch(
      authSlice.actions.changed({
        loading: false,
        profile: {
          id: "persona",
          email: "persona@example.com",
          base_currency: "COP",
        },
      }),
    );
  });
  expect(
    await screen.findByRole("button", { name: "Ir al inicio" }),
  ).toBeTruthy();
  expect(auth.verifyEmail).toHaveBeenCalledTimes(1);
  expect(auth.verifyEmail).toHaveBeenCalledWith("token-original");
});
