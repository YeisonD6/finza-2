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
      onMonthChange={setMonth}
      onRegister={() => setPage("new")}
      onOpenMovements={() => setPage("movements")}
    />
  );
}
