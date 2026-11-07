import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSnapshot,
  pickBudget,
  signedOutSnapshot,
} from "../src/features/widgets/snapshot";

const budget = (
  category_name: string,
  percent: string,
  status: "on_track" | "warning" | "exceeded",
  remaining = "100000.00",
) => ({ category_name, percent, status, remaining });

const now = new Date("2026-11-07T15:42:00.000Z");

test("widget snapshot carries preformatted month totals and nothing identifying", () => {
  const snapshot = buildSnapshot({
    summary: {
      month: "2026-11",
      income: "3650000.00",
      expense: "1873600.00",
      net: "1776400.00",
    },
    budgets: [],
    now,
  });
  assert.equal(snapshot.monthLabel, "Noviembre");
  assert.equal(snapshot.net, "+$ 1.776.400");
  assert.equal(snapshot.netTone, "positive");
  assert.equal(snapshot.income, "$ 3.650.000");
  assert.equal(snapshot.expense, "$ 1.873.600");
  assert.equal(snapshot.updatedAt, "2026-11-07T15:42:00.000Z");
  assert.match(snapshot.spoken.net, /^Balance del mes: /);
  assert.equal(snapshot.budget, null);
  const json = JSON.stringify(snapshot);
  for (const forbidden of ["token", "email", "@", "password", "account"])
    assert.ok(!json.toLowerCase().includes(forbidden), forbidden);
});

test("negative and zero balances keep their sign and centavos stay exact", () => {
  const base = { month: "2026-11", income: "0.00", expense: "50000.50" };
  const negative = buildSnapshot({
    summary: { ...base, net: "-50000.50" },
    budgets: [],
    now,
  });
  assert.equal(negative.net, "−$ 50.000,50");
  assert.equal(negative.netTone, "negative");
  const zero = buildSnapshot({
    summary: { ...base, expense: "0.00", net: "0.00" },
    budgets: [],
    now,
  });
  assert.equal(zero.net, "$ 0");
  assert.equal(zero.netTone, "zero");
});

test("the widget budget is the most urgent one: exceeded, then warning, then fullest", () => {
  const items = [
    budget("Ocio", "95.00", "warning"),
    budget("Mercado", "40.00", "on_track"),
    budget("Transporte", "112.40", "exceeded", "-24000.00"),
    budget("Hogar", "130.00", "exceeded", "-90000.00"),
  ];
  assert.deepEqual(pickBudget(items), {
    name: "Hogar",
    percent: 130,
    status: "exceeded",
    detail: "Excedido por $ 90.000",
  });
  assert.deepEqual(pickBudget(items.slice(0, 2)), {
    name: "Ocio",
    percent: 95,
    status: "warning",
    detail: "Te quedan $ 100.000",
  });
  assert.equal(pickBudget([]), null);
  const snapshot = buildSnapshot({
    summary: { month: "2026-11", income: "0", expense: "0", net: "0" },
    budgets: items,
    now,
  });
  assert.equal(snapshot.budgetsTotal, 4);
  assert.equal(snapshot.budgetsAlert, 3);
});

test("signing out publishes an empty snapshot", () => {
  const snapshot = signedOutSnapshot(now);
  assert.equal(snapshot.signedIn, false);
  assert.equal(snapshot.net, "");
  assert.equal(snapshot.budget, null);
});
