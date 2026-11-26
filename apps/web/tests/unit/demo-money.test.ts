import { fils, formatAed } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { formatMoney, moneyParts } from "../../src/i18n/format";

describe("demo money formatter", () => {
  it("splits-the-same-text-as-formatAed", () => {
    for (const v of [0n, 5n, 100n, 93373094n, 123456789012n, -495000n]) {
      const p = moneyParts(fils(v));
      expect(`${p.sign}${p.currency} ${p.whole}.${p.frac}`)
        .toBe(formatAed(fils(v)));
    }
  });

  it("groups-thousands-and-keeps-two-fils-digits", () => {
    expect(moneyParts(fils(93373094n))).toEqual({ sign: "",
      currency: "AED", whole: "933,730", frac: "94" });
    expect(moneyParts(fils(5n)).frac).toBe("05");
    expect(moneyParts(fils(-495000n))).toEqual({ sign: "-",
      currency: "AED", whole: "4,950", frac: "00" });
  });

  it("isolates-amounts-in-arabic", () => {
    expect(formatMoney(fils(250000n), "en")).toBe("AED 2,500.00");
    expect(formatMoney(fils(250000n), "ar"))
      .toBe("⁦AED 2,500.00⁩");
  });
});
