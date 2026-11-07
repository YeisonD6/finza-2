import React from "react";
import { Alert } from "react-native";
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
  mockCategory = jest.fn(),
  mockArchive = jest.fn();
jest.mock("expo-crypto", () => {
  let i = 0;
  return { randomUUID: () => `request-${++i}` };
});
jest.mock("../api", () => ({
  useArchiveMovementMutation: () => [mockArchive],
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

test("active type has a check icon and accessible selected state without extra text", async () => {
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  expect(
    screen.getByRole("tab", { name: "Gasto" }).props.accessibilityState
      .selected,
  ).toBe(true);
  await fireEvent.press(screen.getByRole("tab", { name: "Ingreso" }));
  expect(
    screen.getByRole("tab", { name: "Ingreso" }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(
    screen.getByRole("tab", { name: "Gasto" }).props.accessibilityState
      .selected,
  ).toBe(false);
  expect(screen.queryByText(/Seleccionado/)).toBeNull();
});

async function fill() {
  await fireEvent.press(screen.getByRole("tab", { name: "Otra fecha" }));
  await fireEvent.changeText(screen.getByLabelText("Monto"), "1234,50");
  await fireEvent.changeText(
    screen.getByLabelText("Fecha contable (YYYY-MM-DD)"),
    "2024-02-29",
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Alimentación" }));
}

test("missing amount has accessible error and preserves valid fields", async () => {
  await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
  await fireEvent.changeText(
    screen.getByLabelText("Nota (opcional)"),
    "conservar",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  expect(screen.getByText(/Ingresa un monto positivo/)).toBeTruthy();
  expect(screen.getByLabelText("Monto").props.accessibilityHint).toContain(
    "Error:",
  );
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
    screen.getByRole("button", { name: "+ Nueva categoría" }),
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
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  await waitFor(() => expect(focus).toHaveBeenCalled());
  expect(
    screen.getByRole("radio", { name: "Alimentación" }).props.accessibilityHint,
  ).toContain("Categoría no disponible");
  expect(screen.getByLabelText("Monto").props.value).toBe("1234,50");
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
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  expect(
    screen.getByRole("button", { name: "Cerrar sin guardar" }),
  ).toBeDisabled();
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
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  expect(await screen.findByText("Sin conexión")).toBeTruthy();
  expect(screen.getByLabelText("Monto").props.value).toBe("1234,50");
  expect(screen.getByLabelText("Nota (opcional)").props.value).toBe(
    "Mi compra",
  );
  mockCreate.mockImplementation(() => ({
    unwrap: async () => ({ id: "saved" }),
  }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
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
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  expect(
    screen.getByRole("button", { name: "Guardar gasto", disabled: true }).props
      .accessibilityState.busy,
  ).toBe(true);
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar gasto", disabled: true }),
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
  await fireEvent.press(
    screen.getByRole("button", { name: "+ Nueva categoría" }),
  );
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
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  await waitFor(() => expect(saved).toBe(true));
  expect(mockCreate.mock.calls[0][0].category_id).toBe("new-cat");
});

test("editing archives only after confirmation and calls completion once", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {}),
    archived = jest.fn();
  mockArchive.mockImplementation(() => ({ unwrap: async () => {} }));
  await render(
    <MovementForm
      initial={{
        id: "m",
        type: "expense",
        amount: "10.00",
        currency: "COP",
        occurred_on: "2024-02-29",
        category_id: "expense-cat",
        note: "",
        client_request_id: "original",
      }}
      onSaved={() => {}}
      onCancel={() => {}}
      onArchived={archived}
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Archivar movimiento" }),
  );
  expect(mockArchive).not.toHaveBeenCalled();
  expect(
    alert.mock.calls[0][2]?.find((button) => button.style === "cancel"),
  ).toBeTruthy();
  await act(async () => {
    await alert.mock.calls[0]
      [2]!.find((button) => button.text === "Archivar")!
      .onPress?.();
  });
  expect(mockArchive).toHaveBeenCalledWith("m");
  expect(archived).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});

// Yoga can shrink direct text children of a growing ScrollView vertically.
test.each([1, 2])(
  "form labels remain complete and cannot shrink at font scale %s",
  async (fontScale) => {
    const dimensions = jest
      .spyOn(require("react-native"), "useWindowDimensions")
      .mockReturnValue({ width: 360, height: 800, scale: 3, fontScale });
    await render(<MovementForm onSaved={() => {}} onCancel={() => {}} />);
    for (const label of ["Categoría", "Fecha contable", "Nota (opcional)"]) {
      const text = screen.getByText(label);
      expect(text).toBeTruthy();
      expect(text.props.allowFontScaling).toBe(true);
      expect(text).toHaveStyle({ flexShrink: 0 });
      expect(text.props.numberOfLines).toBeUndefined();
    }
    dimensions.mockRestore();
  },
);
