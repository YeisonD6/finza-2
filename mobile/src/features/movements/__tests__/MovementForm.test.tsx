import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { MovementForm } from "../MovementForm";
import * as announcements from "../../../shared/accessibility/announcements";

const mockCreate = jest.fn(),
  mockEdit = jest.fn(),
  mockCategory = jest.fn();
jest.mock("expo-crypto", () => {
  let i = 0;
  return { randomUUID: () => `request-${++i}` };
});
jest.mock("../api", () => ({
  useCategoriesQuery: () => ({
    data: [
      {
        id: "expense-cat",
        name: "Alimentación",
        movement_type: "expense",
        is_system: true,
      },
      {
        id: "income-cat",
        name: "Salario",
        movement_type: "income",
        is_system: true,
      },
    ],
  }),
  useCreateMovementMutation: () => [mockCreate],
  useEditMovementMutation: () => [mockEdit],
  useCreateCategoryMutation: () => [mockCategory],
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("active type has visible text as well as accessible selected state", async () => {
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  expect(screen.getByText("Gasto ✓ Seleccionado")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Ingreso" }));
  expect(screen.getByText("Ingreso ✓ Seleccionado")).toBeTruthy();
  expect(screen.queryByText("Gasto ✓ Seleccionado")).toBeNull();
});

async function fill() {
  await fireEvent.changeText(
    screen.getByLabelText("Monto en pesos colombianos (COP)"),
    "1234,50",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Fecha contable (YYYY-MM-DD)"),
    "2024-02-29",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Alimentación" }));
}

test("missing amount has accessible error and preserves valid fields", async () => {
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  await fireEvent.changeText(
    screen.getByLabelText("Nota (opcional)"),
    "conservar",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  expect(screen.getByText(/Ingresa un monto positivo/)).toBeTruthy();
  expect(
    screen.getByLabelText("Monto en pesos colombianos (COP)").props
      .accessibilityHint,
  ).toContain("Error:");
  expect(screen.getByLabelText("Nota (opcional)").props.value).toBe(
    "conservar",
  );
});

test("invalid category name has associated error and keeps the financial draft", async () => {
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  await fireEvent.changeText(
    screen.getByLabelText("Nota (opcional)"),
    "Conservar esta nota",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Agregar categoría" }),
  );
  expect(
    screen.getByLabelText("Nueva categoría (opcional)").props.accessibilityHint,
  ).toContain("Error: El nombre de categoría");
  expect(screen.getByLabelText("Nota (opcional)").props.value).toBe(
    "Conservar esta nota",
  );
  expect(mockCategory).not.toHaveBeenCalled();
});

test("server category error focuses the category group and preserves canonical amount text", async () => {
  const focus = jest
    .spyOn(announcements, "focusAccessibility")
    .mockImplementation(() => {});
  mockCreate.mockImplementation(() => ({
    unwrap: async () => {
      throw {
        data: {
          message: "Revisa categoría",
          field_errors: { category_id: "Categoría no disponible" },
        },
      };
    },
  }));
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  await fill();
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  await waitFor(() => expect(focus).toHaveBeenCalled());
  expect(
    screen.getByRole("button", { name: "Alimentación" }).props
      .accessibilityHint,
  ).toContain("Categoría no disponible");
  expect(
    screen.getByLabelText("Monto en pesos colombianos (COP)").props.value,
  ).toBe("1234,50");
  focus.mockRestore();
});

test("saving once announces success once even when submit is pressed twice", async () => {
  let finish!: (value: { id: string }) => void;
  const saved = jest.fn(),
    speech = jest.spyOn(announcements, "announce");
  mockCreate.mockImplementation(() => ({
    unwrap: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  }));
  await render(<MovementForm onSaved={saved} onCancel={() => {}} />);
  await fill();
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  await act(() => {
    finish({ id: "saved" });
  });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(saved).toHaveBeenCalledTimes(1);
  expect(
    speech.mock.calls.filter(([message]) => message === "Movimiento guardado"),
  ).toHaveLength(1);
  speech.mockRestore();
});

test("network retry preserves amount, note and the same idempotency key", async () => {
  let saves = 0;
  mockCreate.mockImplementation(() => ({
    unwrap: async () => {
      throw { data: { message: "Sin conexión" } };
    },
  }));
  await render(
    <MovementForm
      onSaved={() => {
        saves++;
      }}
      onCancel={() => {}}
    />,
  );
  await fill();
  await fireEvent.changeText(
    screen.getByLabelText("Nota (opcional)"),
    "Mi compra",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  expect(await screen.findByText("Sin conexión")).toBeTruthy();
  expect(
    screen.getByLabelText("Monto en pesos colombianos (COP)").props.value,
  ).toBe("1234,50");
  expect(screen.getByLabelText("Nota (opcional)").props.value).toBe(
    "Mi compra",
  );
  mockCreate.mockImplementation(() => ({
    unwrap: async () => ({ id: "saved" }),
  }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  await waitFor(() => expect(saves).toBe(1));
  const first = mockCreate.mock.calls[0][0],
    second = mockCreate.mock.calls[1][0];
  expect(first.client_request_id).toBe(second.client_request_id);
  expect(second.amount).toBe("1234.50");
});

test("busy blocks duplicate saves and editing uses PATCH payload", async () => {
  let finish!: () => void;
  mockEdit.mockImplementation(() => ({
    unwrap: () =>
      new Promise<void>((r) => {
        finish = r;
      }),
  }));
  const initial = {
    id: "m",
    type: "expense" as const,
    amount: "10.00",
    currency: "COP" as const,
    occurred_on: "2024-02-29",
    category_id: "expense-cat",
    note: "",
    client_request_id: "original",
  };
  await render(
    <MovementForm initial={initial} onSaved={() => {}} onCancel={() => {}} />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  expect(
    screen.getByRole("button", { name: "Guardar movimiento", disabled: true })
      .props.accessibilityState.busy,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento", disabled: true }),
  );
  await act(() => {
    finish();
  });
  expect(mockEdit.mock.calls).toHaveLength(1);
  expect(mockEdit.mock.calls[0][0].changes.client_request_id).toBeUndefined();
});

test("creating a private category selects it and allows saving", async () => {
  mockCategory.mockImplementation(() => ({
    unwrap: async () => ({ id: "new-cat", name: "Mascotas" }),
  }));
  mockCreate.mockImplementation(() => ({ unwrap: async () => ({ id: "m" }) }));
  let saved = false;
  await render(
    <MovementForm
      onSaved={() => {
        saved = true;
      }}
      onCancel={() => {}}
    />,
  );
  await fill();
  await fireEvent.changeText(
    screen.getByLabelText("Nueva categoría (opcional)"),
    "Mascotas",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Agregar categoría" }),
  );
  await waitFor(() =>
    expect(
      screen.getByLabelText("Nueva categoría (opcional)").props.value,
    ).toBe(""),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar movimiento" }),
  );
  await waitFor(() => expect(saved).toBe(true));
  expect(mockCreate.mock.calls[0][0].category_id).toBe("new-cat");
});
