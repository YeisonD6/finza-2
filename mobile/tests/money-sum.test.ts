import { sumAmounts } from "../src/shared/formatting/money";

test("sums decimal strings exactly, beyond the safe integer range", () => {
  expect(sumAmounts(["620000.00", "310000.50"])).toBe("930000.50");
  expect(sumAmounts(["999999999999999.99", "0.01"])).toBe("1000000000000000.00");
  expect(sumAmounts(["100", "-250.5"])).toBe("-150.50");
  expect(sumAmounts([])).toBe("0.00");
});
