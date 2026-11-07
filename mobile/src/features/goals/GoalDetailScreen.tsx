import { useState } from "react";
import { router, usePreventRemove } from "expo-router";
import {
  useGoalsQuery,
  useGoalContributionsQuery,
  useArchiveGoalMutation,
  useDeleteContributionMutation,
} from "./api";
import { GoalProgress } from "./components/GoalProgress";
import {
  GoalCelebration,
  useGoalCelebration,
} from "./components/GoalCelebration";
import { GoalForm } from "./components/GoalForm";
import { ContributionForm } from "./components/ContributionForm";
import { targetDateLabel } from "./domain";
import { Screen } from "../../shared/ui/Screen";
import { Card } from "../../shared/ui/Card";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Banner } from "../../shared/ui/Banner";
import { QueryState } from "../../shared/ui/QueryState";
import { confirmAction } from "../../shared/ui/confirmAction";
import { formatCOP } from "../../shared/formatting/money";
import { useFormFeedback } from "../../shared/forms/useFormFeedback";
import { announce } from "../../shared/accessibility/announcements";
export function GoalDetailScreen({ id }: { id: string }) {
  const query = useGoalsQuery(),
    contributions = useGoalContributionsQuery(id);
  const [archive] = useArchiveGoalMutation(),
    [remove] = useDeleteContributionMutation();
  const [mode, setMode] = useState<"detail" | "edit" | "contribute">("detail");
  const f = useFormFeedback();
  const disablePrevention = usePreventRemove(f.busy, () => {});
  const goal = query.isError
    ? undefined
    : query.currentData?.find((g) => g.id === id);
  const rows = contributions.isError ? undefined : contributions.currentData;
  const celebrate = useGoalCelebration(
    goal?.status === "completed",
    mode === "detail",
  );
  const form =
    mode === "edit" && goal ? (
      <GoalForm
        initial={goal}
        onSaved={() => setMode("detail")}
        onCancel={() => setMode("detail")}
      />
    ) : mode === "contribute" && goal ? (
      <ContributionForm
        goalId={id}
        onSaved={() => setMode("detail")}
        onCancel={() => setMode("detail")}
      />
    ) : null;
  if (form) return form;
  return (
    <Screen
      title="Tu meta"
      onBack={() => router.back()}
      backLabel="Volver a metas"
      backDisabled={f.busy}
    >
      <QueryState
        loading={!query.currentData && query.isFetching}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      />
      <GoalCelebration show={celebrate} />
      {goal ? (
        <>
          <Card>
            <GoalProgress goal={goal} />
          </Card>
          <AppText>
            Los aportes son dinero que apartas para esta meta; no cambian tus
            ingresos ni gastos del mes.
          </AppText>
          <AppButton
            title="Aportar"
            disabled={f.busy}
            onPress={() => setMode("contribute")}
          />
          <AppButton
            title="Editar meta"
            variant="secondary"
            disabled={f.busy}
            onPress={() => setMode("edit")}
          />
          <AppText variant="heading" accessibilityRole="header">
            Aportes
          </AppText>
          <QueryState
            loading={!rows && contributions.isFetching}
            error={contributions.isError}
            retry={() => {
              void contributions.refetch();
            }}
          />
          {rows?.length === 0 ? (
            <AppText>
              Aún no hay aportes. Empieza con el monto que quieras.
            </AppText>
          ) : null}
          {rows?.map((row) => (
            <Card key={row.id}>
              <AppText
                variant="subhead"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatCOP(row.amount)}
              </AppText>
              <AppText>{targetDateLabel(row.occurred_on)}</AppText>
              {row.note ? <AppText>{row.note}</AppText> : null}
              <AppButton
                title="Eliminar aporte"
                accessibilityLabel={`Eliminar aporte de ${formatCOP(row.amount)} del ${row.occurred_on}`}
                variant="danger"
                dangerGhost
                disabled={f.busy}
                onPress={() =>
                  confirmAction(
                    "Eliminar aporte",
                    "Este dinero dejará de contar para tu meta.",
                    "Eliminar",
                    () => {
                      void f.run(async () => {
                        await remove({
                          goalId: id,
                          contributionId: row.id,
                        }).unwrap();
                        announce("Aporte eliminado");
                      });
                    },
                  )
                }
              />
            </Card>
          ))}
          <AppButton
            title="Archivar meta"
            variant="danger"
            dangerGhost
            disabled={f.busy}
            onPress={() =>
              confirmAction(
                "Archivar meta",
                `¿Archivar ${goal.name}? Dejará de aparecer en tus metas activas.`,
                "Archivar",
                () => {
                  void f.run(async () => {
                    await archive(id).unwrap();
                    announce("Meta archivada");
                    disablePrevention();
                    router.replace("/(tabs)/goals");
                  });
                },
              )
            }
          />
        </>
      ) : query.currentData && !query.isError ? (
        <AppText>Esta meta no está disponible o fue archivada.</AppText>
      ) : null}
      <Banner message={f.message} tone="error" announce={false} />
    </Screen>
  );
}
