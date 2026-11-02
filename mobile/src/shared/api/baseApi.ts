import { createApi, BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { auth } from "../../features/auth/runtime";
import { ApiError } from "../../features/auth/client";

const query: BaseQueryFn<
  string | { url: string; method?: string; body?: unknown },
  unknown,
  {
    status: number;
    data: { message: string; field_errors?: Record<string, string> };
  }
> = async (path, api) => {
  try {
    const options = typeof path === "string" ? { url: path } : path;
    return {
      data: await auth.request(options.url, {
        signal: api.signal,
        method: options.method,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      }),
    };
  } catch (error) {
    return {
      error: {
        status: error instanceof ApiError ? error.status : 0,
        data: {
          message: error instanceof Error ? error.message : "Error de conexión",
          field_errors: error instanceof ApiError ? error.fields : undefined,
        },
      },
    };
  }
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: query,
  tagTypes: ["Movements", "Categories", "Dashboard"],
  endpoints: (builder) => ({
    me: builder.query<import("../../features/auth/client").Profile, void>({
      query: () => "/api/v1/me",
    }),
  }),
});
export const { useMeQuery } = baseApi;
