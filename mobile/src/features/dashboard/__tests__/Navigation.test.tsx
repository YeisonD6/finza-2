// renderRouter resets fake timers between renders. Disable notification batching only
// in this renderer so cached RAF callbacks cannot outlive their fake timer clock.
// Production reducers, RTK Query middleware and auth reset callbacks are exercised.
jest.mock("@reduxjs/toolkit", () => {
  const actual = jest.requireActual("@reduxjs/toolkit");
  return {
    ...actual,
    configureStore: (options: object) =>
      actual.configureStore({
        ...options,
        enhancers: (get: (options: object) => unknown) =>
          get({ autoBatch: false }),
      }),
  };
});
jest.mock("expo-secure-store", () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "test-key" }));
jest.mock("../../../shared/theme/fonts", () => ({
  ...jest.requireActual("../../../shared/theme/fonts"),
  useAppFonts: () => [true, null],
}));
import React from "react";
import { router } from "expo-router";
import {
  renderRouter,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "expo-router/testing-library";
import { store } from "../../../core/store";
import { baseApi } from "../../../shared/api/baseApi";
import { auth } from "../../auth/runtime";
import { authSlice } from "../../auth/state";
import * as announcements from "../../../shared/accessibility/announcements";
import type { Movement } from "../../movements/types";
import RootLayout from "../../../app/_layout";
import Index from "../../../app/index";
import AuthLayout from "../../../app/(auth)/_layout";
import Login from "../../../app/(auth)/login";
import Welcome from "../../../app/(auth)/welcome";
import TabLayout from "../../../app/(tabs)/_layout";
import Home from "../../../app/(tabs)/index";
import Movements from "../../../app/(tabs)/movements";
import Goals from "../../../app/(tabs)/goals";
import Profile from "../../../app/(tabs)/profile";
import NewMovement from "../../../app/movement/new";
import EditMovement from "../../../app/movement/[id]";
import Budgets from "../../../app/budgets/index";
import BudgetEditor from "../../../app/budgets/[categoryId]";
import NewGoal from "../../../app/goal/new";
import GoalDetail from "../../../app/goal/[id]";
const routes = {
  _layout: RootLayout,
  index: Index,
  "(auth)/_layout": AuthLayout,
  "(auth)/login": Login,
  "(auth)/welcome": Welcome,
  "(tabs)/_layout": TabLayout,
  "(tabs)/index": Home,
  "(tabs)/movements": Movements,
  "(tabs)/goals": Goals,
  "(tabs)/profile": Profile,
  "movement/new": NewMovement,
  "movement/[id]": EditMovement,
  "budgets/index": Budgets,
  "budgets/[categoryId]": BudgetEditor,
  "goal/new": NewGoal,
  "goal/[id]": GoalDetail,
};
const profile = {
  id: "account-a",
  email: "a@example.com",
  base_currency: "COP",
};
beforeEach(() => {
  store.dispatch(authSlice.actions.changed({ profile: null, loading: true }));
});
afterEach(async () => {
  await cleanup();
  auth.onReset();
  jest.restoreAllMocks();
});
function restoreSession(value: typeof profile | null) {
  jest.spyOn(auth, "restore").mockImplementation(async () => {
    store.dispatch(
      authSlice.actions.changed({ profile: value, loading: false }),
    );
  });
}
test("private routes redirect without session, auth routes redirect with session", async () => {
  restoreSession(null);
  await renderRouter(routes, { initialUrl: "/(tabs)/movements" });
  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
});
test("authenticated auth route redirects to tabs", async () => {
  restoreSession(profile);
  jest.spyOn(auth, "request").mockResolvedValue({
    month: "2024-02",
    income: "0.00",
    expense: "0.00",
    net: "0.00",
    comparison: { reason: "no_previous_data", delta: null, percent: null },
    recent_movements: [],
  });
  // Categories need an array; summary is otherwise deliberately empty.
  const request = jest.mocked(auth.request);
  request.mockImplementation(async (path) =>
    path.includes("categories")
      ? []
      : {
          month: "2024-02",
          income: "0.00",
          expense: "0.00",
          net: "0.00",
          comparison: {
            reason: "no_previous_data",
            delta: null,
            percent: null,
          },
          recent_movements: [],
        },
  );
  await renderRouter(routes, { initialUrl: "/(auth)/login" });
  await waitFor(() => expect(screen).toHavePathname("/"));
  expect(
    screen.getByRole("tab", { name: "Inicio" }).props.accessibilityState
      .selected,
  ).toBe(true);
});
test("dashboard → real modal → save → accounting month, invalidated cache and one success announcement", async () => {
  restoreSession(profile);
  const speech = jest.spyOn(announcements, "announce");
  let saved: Movement | undefined;
  jest.spyOn(auth, "request").mockImplementation(async (path, init) => {
    if (init?.method === "POST") {
      saved = { ...JSON.parse(init.body as string), id: "saved-movement" };
      return saved;
    }
    if (path.startsWith("/api/v1/categories"))
      return [
        {
          id: "expense-cat",
          name: "Alimentación",
          movement_type: "expense",
          is_system: true,
        },
      ];
    if (path.startsWith("/api/v1/movements"))
      return {
        items: saved ? [saved] : [],
        next_cursor: null,
        month: "2024-02",
      };
    return {
      month: new URL("http://test" + path).searchParams.get("month"),
      currency: "COP",
      income: "0.00",
      expense: saved?.amount ?? "0.00",
      net: saved ? "-" + saved.amount : "0.00",
      comparison: { reason: "no_previous_data", delta: null, percent: null },
      recent_movements: saved ? [saved] : [],
    };
  });
  await renderRouter(routes, { initialUrl: "/(tabs)" });
  await screen.findByText(/Registra tu primer movimiento/);
  await fireEvent.press(
    screen.getByRole("button", { name: /^Mes: .*Toca para elegir otro mes$/ }),
  );
  await fireEvent.changeText(screen.getByLabelText("Mes (YYYY-MM)"), "2024-02");
  await fireEvent.press(screen.getByRole("button", { name: "Aplicar mes" }));
  await screen.findByRole("button", {
    name: "Mes: febrero 2024. Toca para elegir otro mes",
  });
  const beforeSaveSummaries = speech.mock.calls.filter(([message]) =>
    message.includes("Inicio 2024-02"),
  ).length;
  await fireEvent.press(
    screen.getByRole("button", { name: "Registrar movimiento" }),
  );
  await screen.findByRole("header", { name: "Registrar movimiento" });
  await fireEvent.changeText(screen.getByLabelText("Monto"), "1234,50");
  await fireEvent.press(screen.getByRole("tab", { name: "Otra fecha" }));
  await fireEvent.changeText(
    screen.getByLabelText("Fecha contable (YYYY-MM-DD)"),
    "2024-02-29",
  );
  await fireEvent.press(
    await screen.findByRole("radio", { name: "Alimentación" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  expect(
    await screen.findByLabelText(
      "Flujo neto del mes: Monto de menos $ 1.234,50 pesos colombianos",
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", {
      name: "Mes: febrero 2024. Toca para elegir otro mes",
    }),
  ).toBeTruthy();
  expect(saved?.amount).toBe("1234.50");
  expect(
    speech.mock.calls.filter(([message]) => message === "Movimiento guardado"),
  ).toHaveLength(1);
  expect(screen.getByText("¡Primer movimiento de febrero!")).toBeTruthy();
  expect(
    speech.mock.calls.filter(([message]) => message.includes("Inicio 2024-02")),
  ).toHaveLength(beforeSaveSummaries); // Returning from save adds no duplicate summary.
  await fireEvent.press(screen.getByRole("button", { name: "Ver todos" }));
  await screen.findByRole("header", { name: "Movimientos" });
  await fireEvent.press(screen.getByRole("tab", { name: "Inicio" }));
  expect(await screen.findByRole("header", { name: "FINZA" })).toBeTruthy();
});

test("logout clears financial cache, navigates to login and retains the remote revocation message", async () => {
  restoreSession(profile);
  jest.spyOn(auth, "request").mockResolvedValue(profile);
  jest.spyOn(auth, "logout").mockImplementation(async () => {
    await auth.clear();
    throw new Error("remote unavailable");
  });
  await renderRouter(routes, { initialUrl: "/(tabs)/profile" });
  expect(await screen.findByText("a@example.com")).toBeTruthy();
  expect(screen.getByText("Privacidad y seguridad")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(
    await screen.findByText(/No se pudo confirmar la revocación remota/),
  ).toBeTruthy();
  expect(store.getState().auth.profile).toBeNull();
  expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
});
test("native route removal is blocked during a save and released on success", async () => {
  restoreSession(profile);
  let finish!: (record: Movement) => void;
  let saved: Movement | undefined;
  jest.spyOn(auth, "request").mockImplementation(async (path, init) => {
    if (init?.method === "POST") {
      return new Promise((resolve) => {
        finish = (record) => {
          saved = record;
          resolve(record);
        };
      });
    }
    if (path.includes("categories"))
      return [
        {
          id: "expense-cat",
          name: "Alimentación",
          movement_type: "expense",
          is_system: true,
        },
      ];
    return {
      month: new URL("http://test" + path).searchParams.get("month"),
      income: "0.00",
      expense: saved?.amount ?? "0.00",
      net: saved ? "-" + saved.amount : "0.00",
      comparison: { reason: "no_previous_data", delta: null, percent: null },
      recent_movements: saved ? [saved] : [],
    };
  });
  await renderRouter(routes, { initialUrl: "/movement/new" });
  await fireEvent.changeText(screen.getByLabelText("Monto"), "10,00");
  await fireEvent.press(
    await screen.findByRole("radio", { name: "Alimentación" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Guardar gasto" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Cerrar sin guardar" }),
    ).toBeDisabled(),
  );
  await act(() => router.replace("/(tabs)"));
  expect(
    screen.getByRole("header", { name: "Registrar movimiento" }),
  ).toBeTruthy();
  await act(() =>
    finish({
      id: "saved",
      type: "expense",
      amount: "10.00",
      currency: "COP",
      category_id: "expense-cat",
      occurred_on: "2024-02-29",
      note: "",
      client_request_id: "key",
    }),
  );
  await waitFor(() => expect(screen).toHavePathname("/"));
  expect(
    await screen.findByLabelText(
      "Flujo neto del mes: Monto de menos $ 10,00 pesos colombianos",
    ),
  ).toBeTruthy();
});

test("welcome shows three distinct steps, accessible progress and finishes at login", async () => {
  restoreSession(null);
  await renderRouter(routes, { initialUrl: "/(auth)/welcome" });
  expect(screen.queryByText("Te damos la bienvenida")).toBeNull();
  expect(screen.queryByText("FINZA")).toBeNull();
  expect(
    screen.getByRole("header", { name: "Hola, soy Monedin" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 1 de 3")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  expect(
    screen.getByRole("header", { name: "Registra en segundos" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 2 de 3")).toBeTruthy();
  // The mockup is visual only: its equivalent is in the paragraph.
  expect(screen.queryByRole("button", { name: /Editar Gasto/ })).toBeNull();
  expect(
    screen.getByText(/un gasto de alimentación de \$ 18.500/),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  expect(
    screen.getByRole("header", { name: "Mira crecer tus metas" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 3 de 3")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByText(/65 % de su camino recorrido/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Empezar" }));
  await waitFor(() => expect(screen).toHavePathname("/login"));
});

test("welcome skip opens login", async () => {
  restoreSession(null);
  await renderRouter(routes, { initialUrl: "/(auth)/welcome" });
  await fireEvent.press(screen.getByRole("button", { name: "Saltar" }));
  await waitFor(() => expect(screen).toHavePathname("/login"));
});

test.each(["/budgets", "/budgets/c", "/goal/new", "/goal/g"])(
  "new private route %s requires a session",
  async (initialUrl) => {
    restoreSession(null);
    await renderRouter(routes, { initialUrl });
    await waitFor(() => expect(screen).toHavePathname("/login"));
  },
);
test("profile replay of welcome preserves session and returns to profile", async () => {
  restoreSession(profile);
  jest.spyOn(auth, "request").mockResolvedValue(profile);
  await renderRouter(routes, { initialUrl: "/(tabs)/profile" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Privacidad y seguridad" }),
  );
  expect(
    screen.getByText(/Las sesiones de acceso duran 15 minutos/),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Volver al perfil" }),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Accesibilidad" }));
  expect(
    screen.getByText(/lector de pantalla, texto grande y movimiento reducido/),
  ).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Volver al perfil" }),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Volver a ver la bienvenida" }),
  );
  expect(
    await screen.findByRole("header", { name: "Hola, soy Monedin" }),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Saltar" }));
  expect(await screen.findByRole("header", { name: "Perfil" })).toBeTruthy();
  expect(store.getState().auth.profile?.id).toBe(profile.id);
});
test("goal creation routes to detail, contribution updates progress without changing movements", async () => {
  restoreSession(profile);
  let goal = {
    id: "g",
    name: "Viaje",
    target_amount: "100.00",
    saved_amount: "0.00",
    remaining: "100.00",
    percent: "0.00",
    target_date: null,
    status: "active",
    currency: "COP",
    created_at: "2026-11-07T00:00:00Z",
  };
  let contributions: object[] = [];
  const request = jest
    .spyOn(auth, "request")
    .mockImplementation(async (path, init) => {
      if (path.endsWith("/contributions")) {
        if (init?.method === "POST") {
          const body = JSON.parse(init.body as string);
          const row = {
            ...body,
            id: "contribution",
            goal_id: "g",
            created_at: "2026-11-07T00:00:00Z",
          };
          contributions = [...contributions, row];
          goal = {
            ...goal,
            saved_amount: "100.00",
            remaining: "0.00",
            percent: "100.00",
            status: "completed",
          };
          return row;
        }
        return contributions;
      }
      if (path === "/api/v1/goals")
        return init?.method === "POST" ? goal : [goal];
      return profile;
    });
  await renderRouter(routes, { initialUrl: "/goal/new" });
  await fireEvent.changeText(
    screen.getByLabelText("Nombre de la meta"),
    "Viaje",
  );
  await fireEvent.changeText(screen.getByLabelText("Monto"), "100");
  await fireEvent.press(screen.getByRole("button", { name: "Crear meta" }));
  expect(await screen.findByRole("header", { name: "Tu meta" })).toBeTruthy();
  expect(screen.getByText(/Los aportes son dinero que apartas/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Aportar" }));
  await fireEvent.changeText(screen.getByLabelText("Monto"), "100");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar aporte" }));
  expect(await screen.findByText("¡Meta cumplida!")).toBeTruthy();
  expect(screen.getByText("100,00 % · Completada")).toBeTruthy();
  expect(
    request.mock.calls.some(
      ([path, init]) => path.includes("movements") && init?.method === "POST",
    ),
  ).toBe(false);
});
