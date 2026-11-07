import type { components } from "../../shared/api/schema";
export type Movement = components["schemas"]["MovementOut"];
export type MovementType = Movement["type"];
export type Category = components["schemas"]["CategoryOut"];
export type CreateMovement = Omit<Movement, "id">;
export type MovementPatch = Partial<Omit<CreateMovement, "client_request_id">>;
export type MovementPage = {
  items: Movement[];
  next_cursor: string | null;
  month: string;
};
export type ListFilter = {
  month: string;
  type?: MovementType;
  category_id?: string;
  cursor?: string;
  /** Server-side search in note or category name (accent-insensitive). */
  q?: string;
};
