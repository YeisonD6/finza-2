import { router } from "expo-router";
import { useGoalsQuery } from "./api";
import { GoalProgress } from "./components/GoalProgress";
import { AppButton } from "../../shared/ui/AppButton";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { QueryState } from "../../shared/ui/QueryState";
import { Screen } from "../../shared/ui/Screen";
export function GoalsScreen({ active = true }: { active?: boolean }) {
  const query = useGoalsQuery();
  const goals = query.isError ? undefined : query.currentData;
  const create = () => router.push("/goal/new");
  return (
    <Screen title="Metas" active={active}>
      <QueryState
        loading={!goals && query.isFetching}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      />
      {goals ? (
        goals.length ? (
          <>
            <AppButton title="Nueva meta" onPress={create} />
            {goals.map((goal) => (
              <Card key={goal.id}>
                <GoalProgress goal={goal} />
                <AppButton
                  title={`Ver ${goal.name}`}
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: "/goal/[id]",
                      params: { id: goal.id },
                    })
                  }
                />
              </Card>
            ))}
          </>
        ) : (
          <EmptyState
            active={active}
            title="Ahorrar es más fácil con un objetivo. ¿Para qué quieres ahorrar?"
            action="Crear mi primera meta"
            onAction={create}
          />
        )
      ) : null}
    </Screen>
  );
}
