import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "../shared/api/baseApi";
import { authSlice } from "../features/auth/state";
import { auth } from "../features/auth/runtime";

export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authSlice.reducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
  devTools: false,
});
auth.onReset = () => {
  for (const running of store.dispatch(baseApi.util.getRunningQueriesThunk()))
    running.abort();
  for (const running of store.dispatch(baseApi.util.getRunningMutationsThunk()))
    running.abort();
  store.dispatch(baseApi.util.resetApiState());
};
auth.onChange = (profile, loading) =>
  store.dispatch(authSlice.actions.changed({ profile, loading }));
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
