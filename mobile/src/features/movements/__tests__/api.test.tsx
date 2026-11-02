jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
import { waitFor } from "@testing-library/react-native";
import { store } from "../../../core/store";
import { auth } from "../../auth/runtime";
import { movementsApi } from "../api";

beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  store.dispatch(movementsApi.util.resetApiState());
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("editing invalidates both original and destination month; archive clears list", async () => {
  let moved = false,
    archived = false;
  const record = {
    id: "m",
    type: "expense",
    amount: "250.00",
    currency: "COP",
    category_id: "cat",
    occurred_on: "2024-03-01",
    note: "",
    client_request_id: "key",
  };
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (init?.method === "PATCH") {
        moved = true;
        return record;
      }
      if (init?.method === "DELETE") {
        archived = true;
        return undefined;
      }
      const month = path.includes("2024-02") ? "2024-02" : "2024-03";
      return {
        items: archived
          ? []
          : month === "2024-02"
            ? moved
              ? []
              : [{ ...record, occurred_on: "2024-02-29" }]
            : moved
              ? [record]
              : [],
        month,
        next_cursor: null,
      };
    });
  const old = store.dispatch(
    movementsApi.endpoints.movements.initiate({ month: "2024-02" }),
  );
  const next = store.dispatch(
    movementsApi.endpoints.movements.initiate({ month: "2024-03" }),
  );
  try {
    await old;
    await next;
    await store
      .dispatch(
        movementsApi.endpoints.editMovement.initiate({
          id: "m",
          changes: { occurred_on: "2024-03-01" },
        }),
      )
      .unwrap();
    await waitFor(() => {
      expect(
        movementsApi.endpoints.movements.select({ month: "2024-02" })(
          store.getState(),
        ).data?.items,
      ).toHaveLength(0);
      expect(
        movementsApi.endpoints.movements.select({ month: "2024-03" })(
          store.getState(),
        ).data?.items[0].amount,
      ).toBe("250.00");
    });
    await store
      .dispatch(movementsApi.endpoints.archiveMovement.initiate("m"))
      .unwrap();
    await waitFor(() =>
      expect(
        movementsApi.endpoints.movements.select({ month: "2024-03" })(
          store.getState(),
        ).data?.items,
      ).toHaveLength(0),
    );
    await auth.clear();
    expect(JSON.stringify(store.getState())).not.toContain("250.00");
  } finally {
    old.unsubscribe();
    next.unsubscribe();
    store.dispatch(movementsApi.util.resetApiState());
    request.mockRestore();
  }
});
