import { baseApi } from "../../shared/api/baseApi";
import type { components } from "../../shared/api/schema";

type BudgetList = components["schemas"]["BudgetList"];
type BudgetStatus = components["schemas"]["BudgetStatus"];
type BudgetUpsert = components["schemas"]["BudgetUpsert"];

export const budgetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    budgets: builder.query<BudgetList, string | void>({
      query: (month) =>
        month === undefined
          ? "/api/v1/budgets"
          : `/api/v1/budgets?month=${encodeURIComponent(month)}`,
      providesTags: ["Budgets"],
    }),
    upsertBudget: builder.mutation<
      BudgetStatus,
      { categoryId: string; body: BudgetUpsert }
    >({
      query: ({ categoryId, body }) => ({
        url: `/api/v1/budgets/${categoryId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Budgets"],
    }),
    deleteBudget: builder.mutation<void, string>({
      query: (categoryId) => ({
        url: `/api/v1/budgets/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Budgets"],
    }),
  }),
});

export const {
  useBudgetsQuery,
  useUpsertBudgetMutation,
  useDeleteBudgetMutation,
} = budgetsApi;
