import { baseApi } from "../../shared/api/baseApi";
import type { components } from "../../shared/api/schema";

export type DashboardSummary = components["schemas"]["DashboardSummary"];

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    dashboard: builder.query<DashboardSummary, string>({
      query: (month) =>
        `/api/v1/dashboard/summary?month=${encodeURIComponent(month)}`,
      providesTags: ["Dashboard"],
    }),
  }),
});
export const { useDashboardQuery } = dashboardApi;
