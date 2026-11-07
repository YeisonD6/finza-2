import { bogotaToday } from "../../features/movements/domain";
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
export function monthName(month: string) {
  return months[Number(month.slice(5, 7)) - 1];
}
export function monthLabel(month: string) {
  return `${monthName(month)} ${month.slice(0, 4)}`;
}
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const n = y * 12 + m - 1 + by;
  return `${Math.floor(n / 12)
    .toString()
    .padStart(4, "0")}-${((n % 12) + 1).toString().padStart(2, "0")}`;
}
/** Calendar arithmetic only; occurred_on is never parsed as a UTC date. */
export function previousDay(date = bogotaToday()) {
  let [y, m, d] = date.split("-").map(Number);
  if (--d === 0) {
    if (--m === 0) {
      m = 12;
      y--;
    }
    d = new Date(y, m, 0).getDate();
  }
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}
export function dayLabel(date: string) {
  if (date === bogotaToday()) return "Hoy";
  if (date === previousDay()) return "Ayer";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${weekday} ${d} ${months[m - 1].slice(0, 3)}`;
}
