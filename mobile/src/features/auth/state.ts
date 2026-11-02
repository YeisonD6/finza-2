import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Profile } from "./client";

const initialState: { profile: Profile | null; loading: boolean } = {
  profile: null,
  loading: true,
};
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    changed: (_state, action: PayloadAction<typeof initialState>) =>
      action.payload,
  },
});
