jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
import { waitFor } from "@testing-library/react-native";
import { store } from "../../../core/store";
import { auth } from "../../auth/runtime";
import { movementsApi } from "../../movements/api";
import { budgetsApi } from "../api";

beforeAll(() => jest.useFakeTimers());
afterEach(() => {
  store.dispatch(budgetsApi.util.resetApiState());
  jest.restoreAllMocks();
});
afterAll(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("upsert, movement writes and delete refresh budgets across months; logout clears data", async () => {
  let limit = "100.00";
  let spent = "0.00";
  let removed = false;
  const item = () => ({
    category_id: "cat",
    category_name: "Transporte",
    limit,
    spent,
    remaining: "0.00",
    percent: "0.00",
    status: "on_track",
  });
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (init?.method === "PUT") {
        limit = JSON.parse(init.body as string).amount;
        return item();
      }
      if (path.startsWith("/api/v1/movements") && init?.method) {
        spent =
          init.method === "POST"
            ? "10.00"
            : init.method === "PATCH"
              ? "20.00"
              : "0.00";
        return {};
      }
      if (init?.method === "DELETE") {
        removed = true;
        return undefined;
      }
      return {
        month: path.includes("2024-03") ? "2024-03" : "2024-02",
        currency: "COP",
        items: removed ? [] : [item()],
      };
    });
  const months = ["2024-02", "2024-03"];
  const subscriptions = months.map((month) =>
    store.dispatch(budgetsApi.endpoints.budgets.initiate(month)),
  );
  const cached = (month: string) =>
    budgetsApi.endpoints.budgets.select(month)(store.getState()).data?.items;
  try {
    await Promise.all(subscriptions);
    await store
      .dispatch(
        budgetsApi.endpoints.upsertBudget.initiate({
          categoryId: "cat",
          body: { amount: "200.00", currency: "COP" },
        }),
      )
      .unwrap();
    expect(request).toHaveBeenCalledWith(
      "/api/v1/budgets/cat",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ amount: "200.00", currency: "COP" }),
      }),
    );
    await waitFor(() =>
      months.forEach((month) =>
        expect(cached(month)?.[0].limit).toBe("200.00"),
      ),
    );
    await store
      .dispatch(
        movementsApi.endpoints.createMovement.initiate({
          amount: "10.00",
          currency: "COP",
          type: "expense",
          category_id: "cat",
          occurred_on: "2024-02-29",
          note: "",
          client_request_id: "key",
        }),
      )
      .unwrap();
    await waitFor(() =>
      months.forEach((month) => expect(cached(month)?.[0].spent).toBe("10.00")),
    );
    await store
      .dispatch(
        movementsApi.endpoints.editMovement.initiate({
          id: "m",
          changes: { amount: "20.00" },
        }),
      )
      .unwrap();
    await waitFor(() =>
      months.forEach((month) => expect(cached(month)?.[0].spent).toBe("20.00")),
    );
    await store
      .dispatch(movementsApi.endpoints.archiveMovement.initiate("m"))
      .unwrap();
    await waitFor(() =>
      months.forEach((month) => expect(cached(month)?.[0].spent).toBe("0.00")),
    );
    await store
      .dispatch(budgetsApi.endpoints.deleteBudget.initiate("cat"))
      .unwrap();
    await waitFor(() =>
      months.forEach((month) => expect(cached(month)).toEqual([])),
    );
    expect(request).toHaveBeenCalledWith(
      "/api/v1/budgets/cat",
      expect.objectContaining({ method: "DELETE" }),
    );
    await auth.clear();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  } finally {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
});

test("month is optional and supplied query values are encoded", async () => {
  const request = jest
    .spyOn(auth, "request")
    .mockResolvedValue({ month: "2024-02", currency: "COP", items: [] });
  await store.dispatch(budgetsApi.endpoints.budgets.initiate()).unwrap();
  await store
    .dispatch(budgetsApi.endpoints.budgets.initiate("2024-02&owner_id=b"))
    .unwrap();
  expect(request).toHaveBeenCalledWith("/api/v1/budgets", expect.anything());
  expect(request).toHaveBeenCalledWith(
    "/api/v1/budgets?month=2024-02%26owner_id%3Db",
    expect.anything(),
  );
});
