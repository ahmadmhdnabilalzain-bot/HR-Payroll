import { describe, expect, it } from "vitest";
import { importSample, buildDemoCompany } from "@payroll/demo-data";
import {
  amountsHidden,
  maskCsvColumns,
  maskMoney,
  MONEY_MASK,
} from "../../src/ui/mask";

describe("amounts in text are masked like <Money/>", () => {
  it("masks every way an amount is written", () => {
    for (const t of ["AED 25,300.00", "AED 25,300.00", "+AED 5.00",
      "−AED 1,180.64", "AED 1,000", "took 4,950.00 not 6,000.00"]) {
      expect(maskMoney(t)).not.toMatch(/\d/);
    }
    expect(maskMoney("Pay AED 1,000.00 to Omar.")).toBe(
      `Pay ${MONEY_MASK} to Omar.`);
  });

  it("leaves days, dates and counts alone", () => {
    const t = "22.5 days, 27 Oct 2026, 31 people, 2.4%";
    expect(maskMoney(t)).toBe(t);
  });

  it("the IT manager never reads amounts", () => {
    expect(amountsHidden({ hideAmounts: false, role: "it" })).toBe(true);
    expect(amountsHidden({ hideAmounts: false, role: "hr" })).toBe(false);
  });

  it("the import sample IT downloads has no salary or IBAN", () => {
    const s = importSample(buildDemoCompany());
    const out = maskCsvColumns(s.text, ["Basic salary (AED)", "IBAN"]);
    expect(out).not.toMatch(/AE\d{21}/);
    const rows = out.trim().split("\n").slice(1).map((l) => l.split(","));
    for (const r of rows) {
      expect(r[8]).toBe("masked");
      expect(r[9]).toBe("masked");
    }
  });
});
