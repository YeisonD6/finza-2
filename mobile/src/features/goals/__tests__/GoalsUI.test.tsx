import React from "react";
import { TextInput } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { GoalsScreen } from "../GoalsScreen";
import { GoalForm } from "../components/GoalForm";
import { ContributionForm } from "../components/ContributionForm";
import {
  GoalCelebration,
  useGoalCelebration,
} from "../components/GoalCelebration";
import * as announcements from "../../../shared/accessibility/announcements";
import * as haptics from "../../../shared/theme/haptics";
import { targetAfter, validTargetDate } from "../domain";
const mockCreate = jest.fn(),
  mockUpdate = jest.fn(),
  mockAdd = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePreventRemove: () => jest.fn(),
}));
jest.mock("expo-crypto", () => {
  let i = 0;
  return { randomUUID: () => `uuid-${++i}` };
});
jest.mock("../api", () => ({
  useGoalsQuery: () => ({ currentData: [] }),
  useCreateGoalMutation: () => [mockCreate],
  useUpdateGoalMutation: () => [mockUpdate],
  useAddContributionMutation: () => [mockAdd],
}));
beforeEach(() => jest.clearAllMocks());
test("empty goals invite a first goal", async () => {
  await render(<GoalsScreen />);
  expect(screen.getByText(/Ahorrar es más fácil/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Crear mi primera meta" }),
  ).toBeTruthy();
});
test("create validates name, exact amount, impossible and past dates before submitting", async () => {
  const focus = jest
    .spyOn(TextInput.prototype, "focus")
    .mockImplementation(() => {});
  mockCreate.mockReturnValue({ unwrap: async () => ({ id: "g" }) });
  const saved = jest.fn();
  await render(<GoalForm onSaved={saved} onCancel={() => {}} />);
  await fireEvent.press(screen.getByRole("button", { name: "Crear meta" }));
  expect(screen.getAllByText(/El nombre debe tener/)[0]).toBeTruthy();
  expect(mockCreate).not.toHaveBeenCalled();
  await waitFor(() => expect(focus).toHaveBeenCalled());
  await fireEvent.changeText(
    screen.getByLabelText("Nombre de la meta"),
    "  Viaje  ",
  );
  await fireEvent.changeText(screen.getByLabelText("Monto"), "10,001");
  await fireEvent.changeText(
    screen.getByLabelText("Fecha objetivo (YYYY-MM-DD)"),
    "2020-02-30",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Crear meta" }));
  expect(mockCreate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Monto"), "2000,50");
  await fireEvent.press(screen.getByRole("button", { name: "Sin fecha" }));
  await fireEvent.press(screen.getByRole("button", { name: "Crear meta" }));
  expect(mockCreate).toHaveBeenCalledWith({
    name: "Viaje",
    target_amount: "2000.50",
    target_date: null,
    currency: "COP",
  });
  expect(saved).toHaveBeenCalled();
  focus.mockRestore();
  expect(targetAfter(3, "2026-11-30")).toBe("2027-02-28");
  expect(validTargetDate("9998-02-30")).toBe(false);
});
test("edit uses PATCH payload with explicit null to remove date", async () => {
  mockUpdate.mockReturnValue({ unwrap: async () => ({ id: "g" }) });
  await render(
    <GoalForm
      initial={{
        id: "g",
        name: "Viaje",
        target_amount: "100.00",
        saved_amount: "20.00",
        remaining: "80.00",
        percent: "20.00",
        status: "active",
        target_date: "9998-01-01",
        currency: "COP",
        created_at: "",
      }}
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Sin fecha" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Guardar cambios" }),
  );
  expect(mockUpdate).toHaveBeenCalledWith({
    id: "g",
    changes: { name: "Viaje", target_amount: "100.00", target_date: null },
  });
});
test("contribution retries retain UUID; changing content replaces it and success closes", async () => {
  mockAdd.mockReturnValue({
    unwrap: async () => {
      throw { data: { message: "Sin conexión" } };
    },
  });
  const saved = jest.fn();
  await render(
    <ContributionForm goalId="g" onSaved={saved} onCancel={() => {}} />,
  );
  await fireEvent.changeText(screen.getByLabelText("Monto"), "15,50");
  await fireEvent.press(screen.getByRole("button", { name: "Guardar aporte" }));
  await fireEvent.press(screen.getByRole("button", { name: "Guardar aporte" }));
  expect(mockAdd.mock.calls[0][0]).toEqual(mockAdd.mock.calls[1][0]);
  expect(saved).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Nota del aporte (opcional)"),
    "Ahorro",
  );
  mockAdd.mockReturnValue({ unwrap: async () => ({}) });
  await fireEvent.press(screen.getByRole("button", { name: "Guardar aporte" }));
  expect(mockAdd.mock.calls[2][0].body.client_request_id).not.toBe(
    mockAdd.mock.calls[0][0].body.client_request_id,
  );
  expect(mockAdd.mock.calls[2][0].body.amount).toBe("15.50");
  expect(saved).toHaveBeenCalledTimes(1);
});
function Celebration({
  completed,
  active = true,
}: {
  completed: boolean;
  active?: boolean;
}) {
  const show = useGoalCelebration(completed, active);
  return <GoalCelebration show={show} />;
}
test("completion celebrates with exactly one announcement and haptic through refetch and forms", async () => {
  const announce = jest.spyOn(announcements, "announce"),
    success = jest.spyOn(haptics, "success");
  const view = await render(<Celebration completed={false} />);
  await view.rerender(<Celebration completed />);
  expect(screen.getByText("¡Meta cumplida!")).toBeTruthy();
  await view.rerender(<Celebration completed />);
  await view.rerender(<Celebration completed active={false} />);
  await view.rerender(<Celebration completed />);
  expect(
    announce.mock.calls.filter(([s]) => s === "¡Meta cumplida!"),
  ).toHaveLength(1);
  expect(success).toHaveBeenCalledTimes(1);
});
