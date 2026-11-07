import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
import { useDashboardQuery } from "../dashboard/api";
import { useBudgetsQuery } from "../budgets/api";
import { bogotaToday } from "../movements/domain";
import { buildSnapshot, signedOutSnapshot } from "./snapshot";
import { publishSnapshot, widgetsAvailable } from "./native";

const currentMonth = () => bogotaToday().slice(0, 7);

/**
 * Keeps the home-screen widgets in step with the signed-in account. Widgets never hold
 * a token, so they cannot fetch: the app publishes the current month whenever its own
 * queries refresh (opening the app, saving or editing a movement, changing a budget)
 * and clears the figures on sign-out. RTK Query shares these requests with Inicio.
 */
export function useWidgetSync() {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  const [month, setMonth] = useState(currentMonth);
  const skip = !widgetsAvailable || !profile;
  const summary = useDashboardQuery(month, { skip });
  const budgets = useBudgetsQuery(month, { skip });
  const { refetch: refetchSummary } = summary;
  const { refetch: refetchBudgets } = budgets;

  // Re-align with Bogotá's month whenever queries start (e.g. after signing in).
  useEffect(() => {
    if (!skip) setMonth(currentMonth());
  }, [skip]);

  useEffect(() => {
    if (skip) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const now = currentMonth();
      if (now !== month) {
        setMonth(now);
        return;
      }
      void refetchSummary();
      void refetchBudgets();
    });
    return () => subscription.remove();
  }, [skip, month, refetchSummary, refetchBudgets]);

  useEffect(() => {
    if (!widgetsAvailable || loading) return;
    if (!profile) {
      publishSnapshot(signedOutSnapshot());
      return;
    }
    // Publish only when both requests succeeded: a failed budgets call must not
    // read as "no budgets", and a stale request must not overwrite fresh figures.
    if (summary.isError || budgets.isError) return;
    const data = summary.currentData;
    const items = budgets.currentData?.items;
    if (!data || !items || summary.isFetching || budgets.isFetching) return;
    const now = currentMonth();
    if (data.month !== now) {
      // The month rolled over while the app stayed open: fetch the new one first.
      setMonth(now);
      return;
    }
    publishSnapshot(buildSnapshot({ summary: data, budgets: items }));
  }, [
    loading,
    profile,
    summary.currentData,
    summary.isError,
    summary.isFetching,
    budgets.currentData,
    budgets.isError,
    budgets.isFetching,
  ]);
}
