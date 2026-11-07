import React from "react";
import * as ReactNative from "react-native";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

jest.mock("../runtime", () => ({
  auth: {
    providers: jest.fn(),
    resendVerification: jest.fn(),
  },
}));
jest.mock("../../../shared/accessibility/announcements", () => ({
  announce: jest.fn(),
}));
import { auth } from "../runtime";
import { announce } from "../../../shared/accessibility/announcements";

let VerifyEmailBanner: typeof import("../components/VerifyEmailBanner").VerifyEmailBanner;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(auth.providers).mockReset();
  jest.mocked(auth.resendVerification).mockReset();
  jest.mocked(auth.providers).mockResolvedValue({
    google: false,
    apple: false,
    password_reset: true,
    email_verification: true,
  });
  // Reinicia dismissed y serverSends, conservando el React del renderer.
  jest.doMock("react", () => React);
  jest.doMock("react-native", () => ReactNative);
  jest.isolateModules(() => {
    VerifyEmailBanner =
      require("../components/VerifyEmailBanner").VerifyEmailBanner;
  });
});

test("oculta el aviso cuando el servidor no permite confirmar correos", async () => {
  jest.mocked(auth.providers).mockResolvedValue({
    google: false,
    apple: false,
    password_reset: false,
    email_verification: false,
  });
  await render(<VerifyEmailBanner email="persona@example.com" />);
  await waitFor(() => expect(auth.providers).toHaveBeenCalledTimes(1));
  expect(screen.toJSON()).toBeNull();
  expect(auth.resendVerification).not.toHaveBeenCalled();
});

test("oculta el aviso si falla la consulta de proveedores", async () => {
  jest.mocked(auth.providers).mockRejectedValue(new Error("Sin conexión"));
  await render(<VerifyEmailBanner email="persona@example.com" />);
  await waitFor(() => expect(auth.providers).toHaveBeenCalledTimes(1));
  expect(screen.toJSON()).toBeNull();
  expect(auth.resendVerification).not.toHaveBeenCalled();
});

test("muestra el correo y la acción de enviar cuando el servidor lo permite", async () => {
  await render(<VerifyEmailBanner email="persona@example.com" />);
  expect(
    await screen.findByRole("header", { name: "Confirma tu correo" }),
  ).toBeTruthy();
  expect(
    screen.getByText(/Confirma que persona@example.com es tuyo/),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Enviar enlace" })).toBeTruthy();
});

test("envía el enlace, muestra y anuncia la respuesta y permite reenviarlo", async () => {
  const message =
    "Te enviamos un enlace de confirmación a persona@example.com.";
  jest.mocked(auth.resendVerification).mockResolvedValue(message);
  await render(<VerifyEmailBanner email="persona@example.com" />);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Enviar enlace" }),
  );
  expect(auth.resendVerification).toHaveBeenCalledTimes(1);
  expect(auth.resendVerification).toHaveBeenCalledWith();
  expect(await screen.findByText(message)).toBeTruthy();
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(message);
  expect(screen.queryByRole("button", { name: "Enviar enlace" })).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", { name: "Reenviar enlace" }),
  );
  expect(auth.resendVerification).toHaveBeenCalledTimes(2);
});

test("muestra el mensaje de error de la API", async () => {
  const message = "Demasiados intentos. Intenta más tarde";
  jest.mocked(auth.resendVerification).mockRejectedValue(new Error(message));
  await render(<VerifyEmailBanner email="persona@example.com" />);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Enviar enlace" }),
  );
  expect(await screen.findByText(message)).toBeTruthy();
  expect(auth.resendVerification).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith(message);
});

test("Ahora no oculta el aviso también al volver a montarlo en la misma sesión", async () => {
  const view = await render(<VerifyEmailBanner email="persona@example.com" />);
  await fireEvent.press(
    await screen.findByRole("button", { name: "Ahora no" }),
  );
  expect(screen.toJSON()).toBeNull();
  await view.unmount();
  await render(<VerifyEmailBanner email="persona@example.com" />);
  expect(screen.toJSON()).toBeNull();
  expect(auth.providers).toHaveBeenCalledTimes(1);
  expect(auth.resendVerification).not.toHaveBeenCalled();
});
