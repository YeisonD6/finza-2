import { createApi, BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { auth } from "../../features/auth/runtime";
import { ApiError } from "../../features/auth/client";

const query: BaseQueryFn<
  string,
  unknown,
  { status: number; data: { message: string } }
> = async (path, api) => {
  try {
    return { data: await auth.request(path, { signal: api.signal }) };
  } catch (error) {
    return {
      error: {
        status: error instanceof ApiError ? error.status : 0,
        data: {
          message: error instanceof Error ? error.message : "Error de conexión",
        },
      },
    };
  }
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: query,
  endpoints: (builder) => ({
    me: builder.query<import("../../features/auth/client").Profile, void>({
      query: () => "/api/v1/me",
    }),
  }),
});
export const { useMeQuery } = baseApi;
