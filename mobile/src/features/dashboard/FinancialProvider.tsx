import { createContext, useContext, useState, type ReactNode } from "react";
import { bogotaToday } from "../movements/domain";
import type { Movement } from "../movements/types";
type Saved = { id: string; month: string; first: boolean };
type FinancialState = {
  month: string;
  saved: Saved | null;
  setMonth(month: string): void;
  clearSaved(): void;
  didSave(record: Movement, first: boolean): void;
};
const Context = createContext<FinancialState | null>(null);
export function FinancialProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(bogotaToday().slice(0, 7)),
    [saved, setSaved] = useState<Saved | null>(null);
  return (
    <Context.Provider
      value={{
        month,
        saved,
        setMonth: (value) => {
          setMonth(value);
          setSaved(null);
        },
        clearSaved: () => setSaved(null),
        didSave: (record, first) => {
          const next = record.occurred_on.slice(0, 7);
          setMonth(next);
          setSaved({ id: record.id, month: next, first });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFinancial() {
  const state = useContext(Context);
  if (!state) throw new Error("FinancialProvider required");
  return state;
}
