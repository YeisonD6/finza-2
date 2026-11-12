import { test } from "node:test";
import assert from "node:assert/strict";
import { sumAmounts } from "../src/shared/formatting/money";

test("sums decimal strings exactly, beyond the safe integer range", () => {
  assert.equal(sumAmounts(["620000.00", "310000.50"]), "930000.50");
  assert.equal(
    sumAmounts(["999999999999999.99", "0.01"]),
    "1000000000000000.00",
  );
  assert.equal(sumAmounts(["100", "-250.5"]), "-150.50");
  assert.equal(sumAmounts([]), "0.00");
});
