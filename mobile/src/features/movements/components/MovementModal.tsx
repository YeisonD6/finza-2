import { useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import { usePreventRemove } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../../core/store";
import { useDashboardQuery } from "../../dashboard/api";
import { useFinancial } from "../../dashboard/FinancialProvider";
import { MovementForm } from "../MovementForm";
import { bogotaToday, validMonth } from "../domain";
import type { Movement } from "../types";
export function MovementModal({ initial }: { initial?: Movement }) {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const financial = useFinancial();
  const [month, setMonth] = useState(
    initial?.occurred_on.slice(0, 7) ?? bogotaToday().slice(0, 7),
  );
  const [busy, setBusy] = useState(false);
  const query = useDashboardQuery(month, {
    skip: !profile || !validMonth(month),
  });
  const first = useRef(false);
  // Snapshot before mutation invalidation can refresh the summary with the newly created row.
  if (!busy)
    first.current =
      !!query.currentData &&
      !query.isError &&
      query.currentData.recent_movements.length === 0;
  const disablePrevention = usePreventRemove(busy, () => {});
  if (!profile) return <Redirect href="/(auth)/login" />;
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <MovementForm
      key={`${profile.id}:${initial?.id ?? "new"}`}
      initial={initial}
      onAccountingMonth={setMonth}
      onBusyChange={setBusy}
      onCancel={close}
      onArchived={() => {
        setBusy(false);
        disablePrevention();
        close();
      }}
      onSaved={(record) => {
        setBusy(false);
        disablePrevention();
        if (initial) {
          financial.setMonth(record.occurred_on.slice(0, 7));
          close();
        } else {
          financial.didSave(record, first.current);
          router.dismissTo("/(tabs)");
        }
      }}
    />
  );
}
