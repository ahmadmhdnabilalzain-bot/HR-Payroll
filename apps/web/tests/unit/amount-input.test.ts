import { describe, expect, it } from "vitest";
import { parseAmountInput } from "../../src/i18n/amount-input";

describe("amount input", () => {
  it("amount-input-normalises-digits", () => {
    expect(parseAmountInput("١٠٠٠٠٫٥٠")).toBe(1000050n);
    expect(parseAmountInput("۱۰۰۰۰٫۵")).toBe(1000050n);
    expect(parseAmountInput("10,000.50")).toBe(1000050n);
    expect(parseAmountInput("١٠٬٠٠٠")).toBe(1000000n);
    expect(parseAmountInput(" 10000 ")).toBe(1000000n);
    expect(parseAmountInput("0.05")).toBe(5n);
  });

  it("refuses-the-rest", () => {
    for (const bad of ["10.505", "-5", "1e4", "", "1234567890.00", "1.",
      ".5", "12 34", "Infinity"]) {
      expect(() => parseAmountInput(bad), bad).toThrow(/INVALID_AMOUNT/);
    }
  });
});
