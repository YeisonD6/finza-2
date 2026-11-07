import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { AuthScreen } from "../AuthScreen";

jest.mock("../runtime", () => ({
  auth: {
    register: jest.fn(),
    login: jest.fn(),
    providers: jest.fn(),
    setRemember: jest.fn(),
  },
}));
import { auth } from "../runtime";
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(auth.register).mockReset();
  jest.mocked(auth.login).mockReset();
  jest.mocked(auth.providers).mockResolvedValue({
    google: false,
    apple: false,
    password_reset: false,
  });
});

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
  expect(screen.getByRole("header", { name: "Crea tu cuenta" })).toBeTruthy();
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  await fireEvent.changeText(
    screen.getByLabelText("Contraseña"),
    "another-secret",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Mostrar contraseña" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "¿Ya tienes cuenta? Inicia sesión" }),
  );
  expect(screen.getByRole("header", { name: "Hola de nuevo" })).toBeTruthy();
  expect(screen.getByLabelText("Contraseña").props.value).toBe("");
  expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
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
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(
    await screen.findByText("Escribe un correo como nombre@dominio.com"),
  ).toBeTruthy();
  expect(screen.getByLabelText("Correo electrónico").props.value).toBe(
    "invalid",
  );
  expect(
    screen.getByLabelText("Correo electrónico").props.accessibilityHint,
  ).toContain("Error: Escribe un correo como nombre@dominio.com");
  expect(auth.login).not.toHaveBeenCalled();
  expect(auth.register).not.toHaveBeenCalled();
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
  expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
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
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(
    screen.getByRole("button", { name: "Iniciar sesión", disabled: true }).props
      .accessibilityState.busy,
  ).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
  expect(auth.login).toHaveBeenCalledTimes(1);
  expect(auth.login).toHaveBeenCalledWith("a@example.com", "long password 123");
  expect(auth.setRemember).toHaveBeenCalledWith(true);
  expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
  expect(screen.getByLabelText("Contraseña")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Mostrar contraseña" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "¿No tienes cuenta? Crea una" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
  expect(
    screen.getByRole("switch", { name: "Mantener la sesión iniciada" }),
  ).toBeDisabled();
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
  expect(
    within(input.parent!).getByRole("button", { name: "Mostrar contraseña" }),
  ).toBe(toggle);
  expect(
    screen.getByLabelText("Al menos 12 caracteres: pendiente").props
      .accessibilityLiveRegion,
  ).toBe("polite");
  await fireEvent.changeText(input, "long password 123");
  expect(
    screen.getByLabelText("Al menos 12 caracteres: cumplido"),
  ).toBeTruthy();
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
  expect(
    screen.getByRole("button", { name: "¿Ya tienes cuenta? Inicia sesión" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
  expect(screen.getByLabelText("Contraseña")).toBeDisabled();
  expect(auth.register).toHaveBeenCalledTimes(1);
  expect(auth.login).toHaveBeenCalledTimes(1);
  await act(() => finish({ id: "a" }));
});

test.each([true, false])(
  "login forwards the remember-session choice %s",
  async (remember) => {
    jest
      .mocked(auth.login)
      .mockResolvedValue({
        id: "a",
        email: "a@example.com",
        base_currency: "COP",
      });
    await render(<AuthScreen />);
    const toggle = screen.getByRole("switch", {
      name: "Mantener la sesión iniciada",
    });
    expect(toggle.props.accessibilityState.checked).toBe(true);
    if (!remember) await fireEvent.press(toggle);
    expect(toggle.props.accessibilityState.checked).toBe(remember);
    await fireEvent.changeText(
      screen.getByLabelText("Correo electrónico"),
      "a@example.com",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Contraseña"),
      "long password 123",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    );
    expect(auth.setRemember).toHaveBeenCalledWith(remember);
    expect(auth.login).toHaveBeenCalledWith(
      "a@example.com",
      "long password 123",
    );
  },
);

test.each([true, false])(
  "password recovery on login follows provider capability %s",
  async (password_reset) => {
    jest
      .mocked(auth.providers)
      .mockResolvedValue({ google: false, apple: false, password_reset });
    await render(<AuthScreen />);
    expect(auth.providers).toHaveBeenCalledTimes(1);
    const recovery = screen.queryByRole("button", {
      name: "¿Olvidaste tu contraseña?",
    });
    if (password_reset) expect(recovery).toBeTruthy();
    else expect(recovery).toBeNull();
    expect(screen.queryByRole("button", { name: /Google|Apple/ })).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "¿No tienes cuenta? Crea una" }),
    );
    expect(
      screen.queryByRole("button", { name: "¿Olvidaste tu contraseña?" }),
    ).toBeNull();
  },
);
