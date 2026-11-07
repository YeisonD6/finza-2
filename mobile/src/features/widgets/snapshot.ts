import { amountLabel, formatCOP } from "../../shared/formatting/money";
import { monthName } from "../../shared/formatting/dates";

/**
 * What the home-screen widgets may show. Built in JS and handed to native code as JSON,
 * so iOS and Android render the same preformatted text. It deliberately carries no
 * token, e-mail, account id or movement detail: only month totals and one budget line.
 */
export type WidgetBudget = {
  name: string;
  /** Whole percent of the limit already spent (may exceed 100). */
  percent: number;
  status: "on_track" | "warning" | "exceeded";
  /** Line shown when amounts are visible, e.g. "Te quedan $ 120.000". */
  detail: string;
};

export type WidgetSnapshot = {
  v: 1;
  signedIn: boolean;
  /** Accounting month (YYYY-MM, Bogotá) the totals belong to. */
  month: string;
  monthLabel: string;
  net: string;
  netTone: "positive" | "negative" | "zero";
  income: string;
  expense: string;
  /** Screen-reader labels, worded like the app's own amount labels. */
  spoken: { net: string; income: string; expense: string };
  budget: WidgetBudget | null;
  budgetsTotal: number;
  /** Budgets near or over their limit. */
  budgetsAlert: number;
  updatedAt: string;
};

type Summary = { month: string; income: string; expense: string; net: string };
type Budget = {
  category_name: string;
  remaining: string;
  percent: string;
  status: WidgetBudget["status"];
};

const RANK: Record<WidgetBudget["status"], number> = {
  exceeded: 0,
  warning: 1,
  on_track: 2,
};

const capitalize = (text: string) =>
  text.slice(0, 1).toUpperCase() + text.slice(1);

/** The budget most worth a glance: exceeded first, then near the limit, then fullest. */
export function pickBudget(items: readonly Budget[]): WidgetBudget | null {
  const [top] = [...items].sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] || Number(b.percent) - Number(a.percent),
  );
  if (!top) return null;
  const left = formatCOP(top.remaining.replace(/^-/, ""));
  return {
    name: top.category_name,
    percent: Math.round(Number(top.percent)),
    status: top.status,
    detail:
      top.status === "exceeded" ? `Excedido por ${left}` : `Te quedan ${left}`,
  };
}

export function buildSnapshot({
  summary,
  budgets,
  now = new Date(),
}: {
  summary: Summary;
  budgets: readonly Budget[];
  now?: Date;
}): WidgetSnapshot {
  const negative = summary.net.startsWith("-");
  const zero = /^-?0+(\.0+)?$/.test(summary.net);
  return {
    v: 1,
    signedIn: true,
    month: summary.month,
    monthLabel: capitalize(monthName(summary.month) ?? summary.month),
    net: zero ? formatCOP("0") : `${negative ? "" : "+"}${formatCOP(summary.net)}`,
    netTone: zero ? "zero" : negative ? "negative" : "positive",
    income: formatCOP(summary.income),
    expense: formatCOP(summary.expense),
    spoken: {
      net: `Balance del mes: ${amountLabel(summary.net)}`,
      income: `Ingresos: ${amountLabel(summary.income)}`,
      expense: `Gastos: ${amountLabel(summary.expense)}`,
    },
    budget: pickBudget(budgets),
    budgetsTotal: budgets.length,
    budgetsAlert: budgets.filter((b) => b.status !== "on_track").length,
    updatedAt: now.toISOString(),
  };
}

/** Written on sign-out and account deletion so no figure outlives the session. */
export function signedOutSnapshot(now = new Date()): WidgetSnapshot {
  return {
    v: 1,
    signedIn: false,
    month: "",
    monthLabel: "",
    net: "",
    netTone: "zero",
    income: "",
    expense: "",
    spoken: { net: "", income: "", expense: "" },
    budget: null,
    budgetsTotal: 0,
    budgetsAlert: 0,
    updatedAt: now.toISOString(),
  };
}
