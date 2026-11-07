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
beforeEach(() => jest.clearAllMocks());

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
  await fireEvent.press(
    screen.getByRole("button", { name: "¿No tienes cuenta? Crea una" }),
  );
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "¿Ya tienes cuenta? Inicia sesión" }),
  );
  expect(screen.getByRole("header", { name: "Inicia sesión" })).toBeTruthy();
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

test("automatic login failure returns to login and clears password", async () => {
  (auth.register as jest.Mock).mockResolvedValue({ id: "a" });
  (auth.login as jest.Mock).mockRejectedValueOnce(new Error("Sin conexión"));
  await render(<AuthScreen />);
  await fireEvent.press(
    screen.getByRole("button", { name: "¿No tienes cuenta? Crea una" }),
  );
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
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "a@example.com",
  );
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
  await fireEvent.press(screen.getByRole("button", { name: "Ingresar" }));
  expect(auth.login).toHaveBeenCalledTimes(1);
  await act(() => {
    reject(new Error("Sin conexión"));
  });
  await waitFor(() => expect(screen.getByText("Sin conexión")).toBeTruthy());
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "a@example.com",
  );
});

test("registration logs in with the same credentials and announces welcome once", async () => {
  const speech = jest.spyOn(
    require("../../../shared/accessibility/announcements"),
    "announce",
  );
  (auth.register as jest.Mock).mockResolvedValue({ id: "a" });
  (auth.login as jest.Mock).mockResolvedValue({ id: "a" });
  await render(<AuthScreen initialRegister />);
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    " a@example.com ",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "long password 123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(auth.register).toHaveBeenCalledWith(
    "a@example.com",
    "long password 123",
  );
  expect(auth.login).toHaveBeenCalledWith("a@example.com", "long password 123");
  expect(
    speech.mock.calls.filter(
      ([text]) => text === "Cuenta creada. Te damos la bienvenida a FINZA.",
    ),
  ).toHaveLength(1);
  expect(screen.queryByRole("tab")).toBeNull();
  speech.mockRestore();
});

test("password visibility is an inline checked control with help below the input", async () => {
  await render(<AuthScreen initialRegister />);
  const input = screen.getByLabelText("Contraseña");
  const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
  expect(toggle).toHaveStyle({ width: 48, height: 48 });
  expect(toggle.props.accessibilityState.checked).toBe(false);
  expect(input.parent).toBe(toggle.parent);
  expect(input.props.accessibilityHint).toContain(
    "Usa entre 12 y 128 caracteres",
  );
  await fireEvent.press(toggle);
  expect(
    screen.getByRole("button", { name: "Ocultar contraseña" }).props
      .accessibilityState.checked,
  ).toBe(true);
  expect(input.props.secureTextEntry).toBe(false);
});

test("registration stays locked through automatic login", async () => {
  let finish!: (profile: { id: string }) => void;
  (auth.register as jest.Mock).mockResolvedValue({ id: "a" });
  (auth.login as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await render(<AuthScreen initialRegister />);
  await fireEvent.changeText(
    screen.getByLabelText("Correo electrónico"),
    "a@example.com",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "long password 123",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeDisabled();
  expect(auth.register).toHaveBeenCalledTimes(1);
  expect(auth.login).toHaveBeenCalledTimes(1);
  await act(() => finish({ id: "a" }));
});
