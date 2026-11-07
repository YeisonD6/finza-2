import { baseApi } from "../../shared/api/baseApi";
import type { components } from "../../shared/api/schema";

type Goal = components["schemas"]["GoalOut"];
type GoalCreate = components["schemas"]["GoalCreate"];
type GoalPatch = components["schemas"]["GoalPatch"];
type Contribution = components["schemas"]["ContributionOut"];
type ContributionCreate = components["schemas"]["ContributionCreate"];

export const goalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    goals: builder.query<Goal[], void>({
      query: () => "/api/v1/goals",
      providesTags: ["Goals"],
    }),
    goalContributions: builder.query<Contribution[], string>({
      query: (goalId) => `/api/v1/goals/${goalId}/contributions`,
      providesTags: ["Goals"],
    }),
    createGoal: builder.mutation<Goal, GoalCreate>({
      query: (body) => ({ url: "/api/v1/goals", method: "POST", body }),
      invalidatesTags: ["Goals"],
    }),
    updateGoal: builder.mutation<Goal, { id: string; changes: GoalPatch }>({
      query: ({ id, changes }) => ({
        url: `/api/v1/goals/${id}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: ["Goals"],
    }),
    archiveGoal: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/goals/${id}`, method: "DELETE" }),
      invalidatesTags: ["Goals"],
    }),
    addContribution: builder.mutation<
      Contribution,
      { goalId: string; body: ContributionCreate }
    >({
      query: ({ goalId, body }) => ({
        url: `/api/v1/goals/${goalId}/contributions`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Goals"],
    }),
    deleteContribution: builder.mutation<
      void,
      { goalId: string; contributionId: string }
    >({
      query: ({ goalId, contributionId }) => ({
        url: `/api/v1/goals/${goalId}/contributions/${contributionId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Goals"],
    }),
  }),
});

export const {
  useGoalsQuery,
  useGoalContributionsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useArchiveGoalMutation,
  useAddContributionMutation,
  useDeleteContributionMutation,
} = goalsApi;
