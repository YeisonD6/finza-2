import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { MovementsScreen } from "../MovementsScreen";

const mockArchive = jest.fn((_id: string) => ({ unwrap: async () => {} }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "key" }));
jest.mock("../api", () => ({
  useCategoriesQuery: () => ({ data: [] }),
  useMovementsQuery: () => ({
    currentData: {
      items: [
        {
          id: "m",
          type: "expense",
          amount: "10.00",
          currency: "COP",
          occurred_on: "2024-02-29",
          note: "Compra",
          category_id: "cat",
        },
      ],
      next_cursor: null,
    },
    refetch: () => {},
  }),
  useArchiveMovementMutation: () => [mockArchive],
}));

test("archive requires confirmation and reports success", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await render(
    <MovementsScreen
      email="a@example.com"
      onLogout={() => {}}
      logoutBusy={false}
    />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: /Archivar movimiento de/ }),
  );
  expect(mockArchive.mock.calls).toHaveLength(0);
  const confirm = alert.mock.calls[0][2]!.find((b) => b.text === "Archivar")!;
  await act(async () => {
    await confirm.onPress?.();
  });
  expect(await screen.findByText("Movimiento archivado")).toBeTruthy();
  expect(mockArchive.mock.calls[0][0]).toBe("m");
  alert.mockRestore();
});
