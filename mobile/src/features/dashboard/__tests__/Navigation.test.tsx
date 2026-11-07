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
import Onboarding from "../../../app/(auth)/onboarding";
import { storage } from "../../auth/storage";
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
  "(auth)/onboarding": Onboarding,
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
  jest
    .spyOn(auth, "providers")
    .mockResolvedValue({ google: false, apple: false, password_reset: false });
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
  expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
});
test.each(["/(auth)/login", "/(auth)/welcome"])(
  "authenticated auth route %s redirects to tabs",
  async (initialUrl) => {
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
    await renderRouter(routes, { initialUrl });
    await waitFor(() => expect(screen).toHavePathname("/"));
    expect(
      screen.getByRole("tab", { name: "Inicio" }).props.accessibilityState
        .selected,
    ).toBe(true);
  },
);
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

test("welcome opens four distinct onboarding steps, accessible progress and registration", async () => {
  restoreSession(null);
  const persist = jest.spyOn(storage, "set");
  await renderRouter(routes, { initialUrl: "/(auth)/welcome" });
  expect(screen.getByRole("header", { name: "FINZA" })).toBeTruthy();
  expect(
    screen.getByText("Tus cuentas claras.\nMonedin a tu lado."),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Comenzar" }));
  await waitFor(() => expect(screen).toHavePathname("/onboarding"));
  expect(
    screen.getByRole("header", { name: "Tu mes, de un vistazo" }),
  ).toBeTruthy();
  expect(
    screen.getByLabelText("Paso 1 de 4").props.accessibilityLiveRegion,
  ).toBe("polite");
  expect(screen.queryByRole("button", { name: "Atrás" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  expect(
    screen.getByRole("header", { name: "Registra en segundos" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 2 de 4")).toBeTruthy();
  // Samples stay visual; the paragraph conveys their meaning to screen readers.
  expect(screen.queryByRole("button", { name: /Editar Gasto/ })).toBeNull();
  expect(screen.getByText(/Escribe «almuerzo 18 mil ayer»/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Atrás" }));
  expect(screen.getByLabelText("Paso 1 de 4")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  expect(
    screen.getByRole("header", { name: "Descubre en qué se va" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 3 de 4")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
  expect(
    screen.getByRole("header", { name: "Haz crecer tus metas" }),
  ).toBeTruthy();
  expect(screen.getByLabelText("Paso 4 de 4")).toBeTruthy();
  expect(screen.getAllByRole("header")).toHaveLength(1);
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByText(/Aparta dinero para lo que quieres/)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole("button", { name: "Crear mi cuenta" }),
  );
  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(screen).toHaveSearchParams({ mode: "register" });
  expect(screen.getByRole("header", { name: "Crea tu cuenta" })).toBeTruthy();
  expect(persist).toHaveBeenCalledWith("finza.onboarded", "true");
});

test("welcome onboarding skip opens registration and marks onboarding complete", async () => {
  restoreSession(null);
  const persist = jest.spyOn(storage, "set");
  await renderRouter(routes, { initialUrl: "/(auth)/welcome" });
  await fireEvent.press(screen.getByRole("button", { name: "Comenzar" }));
  await screen.findByLabelText("Paso 1 de 4");
  await fireEvent.press(screen.getByRole("button", { name: "Saltar" }));
  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(screen).toHaveSearchParams({ mode: "register" });
  expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
  expect(persist).toHaveBeenCalledWith("finza.onboarded", "true");
});

test("welcome existing-account action opens login", async () => {
  restoreSession(null);
  await renderRouter(routes, { initialUrl: "/(auth)/welcome" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Ya tengo una cuenta" }),
  );
  await waitFor(() => expect(screen).toHavePathname("/login"));
  expect(screen.getByRole("header", { name: "Hola de nuevo" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
});

test.each(["/budgets", "/budgets/c", "/goal/new", "/goal/g"])(
  "new private route %s requires a session",
  async (initialUrl) => {
    restoreSession(null);
    await renderRouter(routes, { initialUrl });
    await waitFor(() => expect(screen).toHavePathname("/login"));
  },
);
test.each(["Saltar", "Listo"])(
  "profile replay of welcome via %s preserves session and returns to profile",
  async (finish) => {
    restoreSession(profile);
    jest.spyOn(auth, "request").mockResolvedValue(profile);
    const persist = jest.spyOn(storage, "set");
    const remove = jest.spyOn(storage, "remove");
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
    await fireEvent.press(
      screen.getByRole("button", { name: "Accesibilidad" }),
    );
    expect(
      screen.getByText(
        /lector de pantalla, texto grande y movimiento reducido/,
      ),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Volver al perfil" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Volver a ver la bienvenida" }),
    );
    expect(
      await screen.findByRole("header", { name: "Tu mes, de un vistazo" }),
    ).toBeTruthy();
    expect(screen).toHavePathname("/onboarding");
    expect(remove).toHaveBeenCalledWith("finza.onboarded");
    if (finish === "Listo") {
      for (let step = 1; step < 4; step++)
        await fireEvent.press(
          screen.getByRole("button", { name: "Siguiente" }),
        );
      expect(screen.getByLabelText("Paso 4 de 4")).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole("button", { name: finish }));
    expect(await screen.findByRole("header", { name: "Perfil" })).toBeTruthy();
    expect(screen).toHavePathname("/profile");
    expect(store.getState().auth.profile?.id).toBe(profile.id);
    expect(persist).toHaveBeenCalledWith("finza.onboarded", "true");
  },
);
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
