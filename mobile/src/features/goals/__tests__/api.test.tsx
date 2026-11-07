jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
import { waitFor } from "@testing-library/react-native";
import { store } from "../../../core/store";
import { auth } from "../../auth/runtime";
import { dashboardApi } from "../../dashboard/api";
import { goalsApi } from "../api";

beforeAll(() => jest.useFakeTimers());
afterEach(() => {
  store.dispatch(goalsApi.util.resetApiState());
  jest.restoreAllMocks();
});
afterAll(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("goal and contribution mutations refresh progress and allocations, preserve dashboard cache and clear on logout", async () => {
  let name = "Viaje",
    saved = "0.00",
    archived = false;
  let contributions: object[] = [];
  const goal = () => ({
    id: "g",
    name,
    target_amount: "100.00",
    saved_amount: saved,
    remaining: "100.00",
    percent: "0.00",
    target_date: null,
    status: "active",
    currency: "COP",
    created_at: "2024-03-01T00:00:00Z",
  });
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (path.includes("dashboard")) return { net: "100.00" };
      if (init?.method === "POST" && path.endsWith("/contributions")) {
        saved = "25.00";
        const contribution = {
          id: "c",
          goal_id: "g",
          ...JSON.parse(init.body as string),
        };
        contributions = [contribution];
        return contribution;
      }
      if (init?.method === "DELETE" && path.includes("/contributions/")) {
        saved = "0.00";
        contributions = [];
        return undefined;
      }
      if (init?.method === "POST") return goal();
      if (init?.method === "PATCH") {
        name = JSON.parse(init.body as string).name;
        return goal();
      }
      if (init?.method === "DELETE") {
        archived = true;
        return undefined;
      }
      return path.endsWith("/contributions")
        ? contributions
        : archived
          ? []
          : [goal()];
    });
  const list = store.dispatch(goalsApi.endpoints.goals.initiate());
  const allocations = store.dispatch(
    goalsApi.endpoints.goalContributions.initiate("g"),
  );
  const dashboard = store.dispatch(
    dashboardApi.endpoints.dashboard.initiate("2024-02"),
  );
  const cachedGoals = () =>
    goalsApi.endpoints.goals.select()(store.getState()).data;
  const cachedContributions = () =>
    goalsApi.endpoints.goalContributions.select("g")(store.getState()).data;
  try {
    await Promise.all([list, allocations, dashboard]);
    await store
      .dispatch(
        goalsApi.endpoints.createGoal.initiate({
          name: "Viaje",
          target_amount: "100.00",
          currency: "COP",
        }),
      )
      .unwrap();
    expect(request).toHaveBeenCalledWith(
      "/api/v1/goals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Viaje",
          target_amount: "100.00",
          currency: "COP",
        }),
      }),
    );
    await store
      .dispatch(
        goalsApi.endpoints.updateGoal.initiate({
          id: "g",
          changes: { name: "Casa", target_date: null },
        }),
      )
      .unwrap();
    await waitFor(() => expect(cachedGoals()?.[0].name).toBe("Casa"));
    expect(request).toHaveBeenCalledWith(
      "/api/v1/goals/g",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Casa", target_date: null }),
      }),
    );
    const body = {
      amount: "25.00",
      currency: "COP" as const,
      occurred_on: "2024-02-29",
      note: "Ahorro",
      client_request_id: "retry-key",
    };
    await store
      .dispatch(
        goalsApi.endpoints.addContribution.initiate({ goalId: "g", body }),
      )
      .unwrap();
    await waitFor(() => {
      expect(cachedGoals()?.[0].saved_amount).toBe("25.00");
      expect(cachedContributions()?.[0].client_request_id).toBe("retry-key");
    });
    expect(request).toHaveBeenCalledWith(
      "/api/v1/goals/g/contributions",
      expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
    );
    await store
      .dispatch(
        goalsApi.endpoints.deleteContribution.initiate({
          goalId: "g",
          contributionId: "c",
        }),
      )
      .unwrap();
    await waitFor(() => {
      expect(cachedGoals()?.[0].saved_amount).toBe("0.00");
      expect(cachedContributions()).toEqual([]);
    });
    expect(request).toHaveBeenCalledWith(
      "/api/v1/goals/g/contributions/c",
      expect.objectContaining({ method: "DELETE" }),
    );
    await store.dispatch(goalsApi.endpoints.archiveGoal.initiate("g")).unwrap();
    await waitFor(() => expect(cachedGoals()).toEqual([]));
    expect(
      request.mock.calls.filter(([path]) => path.includes("dashboard")),
    ).toHaveLength(1);
    await auth.clear();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
    expect(cachedContributions()).toBeUndefined();
  } finally {
    list.unsubscribe();
    allocations.unsubscribe();
    dashboard.unsubscribe();
  }
});

test("API errors propagate through the standard base query", async () => {
  jest.spyOn(auth, "request").mockRejectedValue(new Error("Sin conexión"));
  const result = await store.dispatch(goalsApi.endpoints.goals.initiate());
  expect(result.error).toEqual({
    status: 0,
    data: { message: "Sin conexión", field_errors: undefined },
  });
});
