jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
import { waitFor } from "@testing-library/react-native";
import { store } from "../../../core/store";
import { auth } from "../../auth/runtime";
import { movementsApi } from "../../movements/api";
import { dashboardApi } from "../api";

beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  store.dispatch(dashboardApi.util.resetApiState());
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("creation, date/amount editing and archive invalidate every dashboard; session reset clears financial data", async () => {
  let stage = 0;
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (init?.method) {
        stage++;
        return {};
      }
      const month = path.includes("2024-02") ? "2024-02" : "2024-03";
      const net =
        stage === 1 && month === "2024-02"
          ? "100.00"
          : stage === 2 && month === "2024-03"
            ? "250.00"
            : "0.00";
      return {
        month,
        currency: "COP",
        income: net,
        expense: "0.00",
        net,
        comparison: { delta: null, percent: null, reason: "no_previous_data" },
        recent_movements: [],
      };
    });
  const feb = store.dispatch(
    dashboardApi.endpoints.dashboard.initiate("2024-02"),
  );
  const mar = store.dispatch(
    dashboardApi.endpoints.dashboard.initiate("2024-03"),
  );
  const net = (month: string) =>
    dashboardApi.endpoints.dashboard.select(month)(store.getState()).data?.net;
  try {
    await feb;
    await mar;
    await store
      .dispatch(
        movementsApi.endpoints.createMovement.initiate({
          type: "income",
          amount: "100.00",
          currency: "COP",
          category_id: "c",
          occurred_on: "2024-02-29",
          note: "",
          client_request_id: "k",
        }),
      )
      .unwrap();
    await waitFor(() => expect(net("2024-02")).toBe("100.00"));
    await store
      .dispatch(
        movementsApi.endpoints.editMovement.initiate({
          id: "m",
          changes: { occurred_on: "2024-03-01", amount: "250.00" },
        }),
      )
      .unwrap();
    await waitFor(() => {
      expect(net("2024-02")).toBe("0.00");
      expect(net("2024-03")).toBe("250.00");
    });
    await store
      .dispatch(movementsApi.endpoints.archiveMovement.initiate("m"))
      .unwrap();
    await waitFor(() => expect(net("2024-03")).toBe("0.00"));
    await auth.clear();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
    expect(net("2024-02")).toBeUndefined();
  } finally {
    feb.unsubscribe();
    mar.unsubscribe();
    store.dispatch(dashboardApi.util.resetApiState());
    request.mockRestore();
  }
});
