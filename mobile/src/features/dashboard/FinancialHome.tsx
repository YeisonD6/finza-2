import { useState } from "react";
import { MovementsScreen } from "../movements/MovementsScreen";
import { bogotaToday } from "../movements/domain";
import { DashboardScreen, type AccountControls } from "./DashboardScreen";

/** Mounted with the account id as key: navigation and drafts reset between users. */
export function FinancialHome(props: AccountControls) {
  const [page, setPage] = useState<"dashboard" | "movements" | "new">(
    "dashboard",
  );
  const [month, setMonth] = useState(bogotaToday().slice(0, 7));
  const [savedReturn, setSavedReturn] = useState(false);
  if (page !== "dashboard")
    return (
      <MovementsScreen
        {...props}
        initialMonth={month}
        initialForm={page === "new"}
        onBack={() => setPage("dashboard")}
        onCreated={
          page === "new"
            ? (record) => {
                setMonth(record.occurred_on.slice(0, 7));
                setSavedReturn(true);
                setPage("dashboard");
              }
            : undefined
        }
      />
    );
  return (
    <DashboardScreen
      {...props}
      month={month}
      silentInitialSummary={savedReturn}
      onMonthChange={(value) => {
        setMonth(value);
        setSavedReturn(false);
      }}
      onRegister={() => {
        setSavedReturn(false);
        setPage("new");
      }}
      onOpenMovements={() => {
        setSavedReturn(false);
        setPage("movements");
      }}
    />
  );
}
