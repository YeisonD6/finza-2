import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AuthScreen } from "../AuthScreen";

jest.mock("../runtime", () => ({
  auth: { register: jest.fn(), login: jest.fn() },
}));
import { auth } from "../runtime";

test("mode navigation clears passwords and visibility while preserving email and unique actions", async () => {
  await render(<AuthScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "keep@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "private-draft",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Mostrar contraseña" }),
  );
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Registrarme" }));
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Ya tengo cuenta" }),
  );
  expect(
    screen.getByRole("header", { name: "Iniciar sesión en Finza" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "keep@example.com",
  );
  const names = screen
    .getAllByRole("button")
    .map((b) => b.props.accessibilityLabel);
  expect(new Set(names).size).toBe(names.length);
});

test("invalid fields retain email and expose a useful accessible error", async () => {
  await render(<AuthScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "invalid",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Ingresar" }));
  expect(await screen.findByText("Ingresa un correo válido")).toBeTruthy();
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "invalid",
  );
});

test("registration success returns to login and clears password", async () => {
  (auth.register as jest.Mock).mockResolvedValue({ id: "a" });
  await render(<AuthScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Registrarme" }));
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "a@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "long password 123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(
    await screen.findByText("Cuenta creada. Ahora inicia sesión."),
  ).toBeTruthy();
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
});

test("busy disables submit and network error preserves email for retry", async () => {
  let reject!: (reason: Error) => void;
  (auth.login as jest.Mock).mockReturnValue(
    new Promise((_resolve, r) => {
      reject = r;
    }),
  );
  await render(<AuthScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "a@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "long password 123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Ingresar" }));
  expect(
    screen.getByRole("button", { name: "Ingresar", disabled: true }).props
      .accessibilityState.busy,
  ).toBe(true);
  await act(() => {
    reject(new Error("Sin conexión"));
  });
  await waitFor(() => expect(screen.getByText("Sin conexión")).toBeTruthy());
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "a@example.com",
  );
});
