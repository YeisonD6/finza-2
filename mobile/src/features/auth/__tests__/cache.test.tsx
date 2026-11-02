jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
import { store } from "../../../core/store";
import { baseApi } from "../../../shared/api/baseApi";
import { auth } from "../runtime";

beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  store.dispatch(baseApi.util.resetApiState());
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("clearing a session removes profile and all RTK Query account data", async () => {
  await store.dispatch(
    baseApi.util.upsertQueryData("me", undefined, {
      id: "A",
      email: "private-a@example.com",
      base_currency: "COP",
    }),
  );
  auth.onChange(
    { id: "A", email: "private-a@example.com", base_currency: "COP" },
    false,
  );
  expect(JSON.stringify(store.getState())).toContain("private-a@example.com");
  await auth.clear();
  expect(JSON.stringify(store.getState())).not.toContain(
    "private-a@example.com",
  );
  expect(store.getState().auth.profile).toBeNull();
  expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
});
