import { baseApi } from "../../shared/api/baseApi";
import type {
  Category,
  CreateMovement,
  ListFilter,
  Movement,
  MovementPage,
  MovementPatch,
  MovementType,
} from "./types";

export const movementsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    categories: builder.query<Category[], void>({
      query: () => "/api/v1/categories",
      providesTags: ["Categories"],
    }),
    createCategory: builder.mutation<
      Category,
      { name: string; movement_type: MovementType }
    >({
      query: (body) => ({ url: "/api/v1/categories", method: "POST", body }),
      invalidatesTags: ["Categories"],
    }),
    movements: builder.query<MovementPage, ListFilter>({
      query: (filters) => {
        const query = Object.entries(filters)
          .filter(([, v]) => v)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
          .join("&");
        return `/api/v1/movements?${query}`;
      },
      providesTags: ["Movements"],
    }),
    movement: builder.query<Movement, string>({
      query: (id) => `/api/v1/movements/${id}`,
      providesTags: ["Movements"],
    }),
    createMovement: builder.mutation<Movement, CreateMovement>({
      query: (body) => ({ url: "/api/v1/movements", method: "POST", body }),
      invalidatesTags: ["Movements", "Dashboard"],
    }),
    editMovement: builder.mutation<
      Movement,
      { id: string; changes: MovementPatch }
    >({
      query: ({ id, changes }) => ({
        url: `/api/v1/movements/${id}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: ["Movements", "Dashboard"],
    }),
    archiveMovement: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/movements/${id}`, method: "DELETE" }),
      invalidatesTags: ["Movements", "Dashboard"],
    }),
  }),
});
export const {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useMovementsQuery,
  useCreateMovementMutation,
  useEditMovementMutation,
  useArchiveMovementMutation,
} = movementsApi;
