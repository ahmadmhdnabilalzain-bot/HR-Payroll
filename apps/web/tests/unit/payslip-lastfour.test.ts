import { describe, expect, it } from "vitest";
import { lastFour } from "../../src/people/Payslip";

describe("payslip aside", () => {
  it("masks-an-iban-to-its-last-four-digits", () => {
    expect(lastFour("AE** **** **** **** ***0017")).toBe("•••• 0017");
    expect(lastFour(null)).toBeNull();
    expect(lastFour("AE** ****")).toBeNull();
  });
});
