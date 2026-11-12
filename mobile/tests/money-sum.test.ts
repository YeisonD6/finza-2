import { test } from "node:test";
import assert from "node:assert/strict";
import { percentText, sumAmounts } from "../src/shared/formatting/money";

test("sums decimal strings exactly, beyond the safe integer range", () => {
  assert.equal(sumAmounts(["620000.00", "310000.50"]), "930000.50");
  assert.equal(
    sumAmounts(["999999999999999.99", "0.01"]),
    "1000000000000000.00",
  );
  assert.equal(sumAmounts(["100", "-250.5"]), "-150.50");
  assert.equal(sumAmounts([]), "0.00");
});

test("percents drop trailing zeros and use a decimal comma", () => {
  assert.equal(percentText("32.50"), "32,5");
  assert.equal(percentText("40.00"), "40");
  assert.equal(percentText("78.89"), "78,89");
  assert.equal(percentText("-7.10"), "-7,1");
  assert.equal(percentText("100"), "100");
});
