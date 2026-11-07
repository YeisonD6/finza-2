import { bogotaToday } from "../movements/domain";
import { shiftMonth } from "../../shared/formatting/dates";
import type { components } from "../../shared/api/schema";
export type Goal = components["schemas"]["GoalOut"];
export function validTargetDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < bogotaToday() ||
    value > "9998-12-31"
  )
    return false;
  const [y, m, d] = value.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return (
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
  );
}
/** Calendar arithmetic with end-of-month clamp, no UTC accounting-date conversion. */
export function targetAfter(months: number, today = bogotaToday()) {
  const month = shiftMonth(today.slice(0, 7), months);
  const [y, m] = month.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const day = Math.min(
    Number(today.slice(8)),
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1],
  );
  return `${month}-${String(day).padStart(2, "0")}`;
}
export function targetDateLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1]} ${y}`;
}
