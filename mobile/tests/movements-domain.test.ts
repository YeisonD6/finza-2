import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bogotaToday,
  formatCOP,
  normalizeAmount,
  validAccountingDate,
  validMonth,
} from "../src/features/movements/domain";

test("amount normalization preserves centavos and large integers exactly", () => {
  assert.equal(normalizeAmount("0,10"), "0.10");
  assert.equal(normalizeAmount("999999999999999,99"), "999999999999999.99");
  assert.equal(normalizeAmount("00012.5"), "12.50");
  assert.equal(formatCOP("999999999999999.99"), "$ 999.999.999.999.999,99 COP");
  for (const value of [
    "0",
    "-1",
    "1.001",
    "1.000,50",
    "1e3",
    "NaN",
    "1000000000000000",
  ])
    assert.throws(() => normalizeAmount(value));
});

test("dates are date-only in Bogota with real leap-day validation", () => {
  assert.equal(bogotaToday(new Date("2026-11-01T02:00:00Z")), "2026-10-31");
  assert.equal(validAccountingDate("2024-02-29"), true);
  for (const date of [
    "2023-02-29",
    "2024-04-31",
    "2024-00-10",
    "1899-12-31",
    "9998-12-31",
    "2024-02-29T23:00:00Z",
  ])
    assert.equal(validAccountingDate(date), false);
  assert.equal(validMonth("2024-02"), true);
  for (const month of ["2024-2", "2024-13", "1899-12", "9999-12"])
    assert.equal(validMonth(month), false);
});
