import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000' }),
  endpoints: (builder) => ({
    health: builder.query<{ status: string }, void>({ query: () => '/health/live' }),
  }),
});
export const { useHealthQuery } = baseApi;
