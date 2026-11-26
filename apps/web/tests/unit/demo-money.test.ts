import { fils, formatAed } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney, MINUS, moneyParts }
  from "../../src/i18n/format";

describe("demo money formatter", () => {
  it("splits-the-same-text-as-formatAed", () => {
    for (const v of [0n, 5n, 100n, 93373094n, 123456789012n, -495000n]) {
      const p = moneyParts(fils(v));
      expect(`${p.sign}${p.currency} ${p.whole}.${p.frac}`)
        .toBe(formatAed(fils(v)).replace(/^-/, MINUS));
    }
  });

  it("groups-thousands-and-keeps-two-fils-digits", () => {
    expect(moneyParts(fils(93373094n))).toEqual({ sign: "",
      currency: "AED", whole: "933,730", frac: "94" });
    expect(moneyParts(fils(5n)).frac).toBe("05");
    expect(moneyParts(fils(-495000n))).toEqual({ sign: "\u2212",
      currency: "AED", whole: "4,950", frac: "00" });
  });

  it("uses-the-true-minus-and-a-plus-on-a-rise", () => {
    expect(formatMoney(fils(-118064n), "en")).toBe("\u2212AED 1,180.64");
    expect(formatSignedMoney(fils(578710n), "en")).toBe("+AED 5,787.10");
    expect(formatSignedMoney(fils(-100n), "en")).toBe("\u2212AED 1.00");
    expect(formatSignedMoney(fils(0n), "en")).toBe("AED 0.00");
  });

  it("writes-a-negative-one-way-typographic-minus-before-aed", () => {
    expect(MINUS).toBe("\u2212");
    expect(formatMoney(fils(-1471906n), "en")).toBe("\u2212AED 14,719.06");
    expect(formatMoney(fils(-1471906n), "en", { plus: true }))
      .toBe("\u2212AED 14,719.06");
    expect(formatMoney(fils(495000n), "en", { plus: true }))
      .toBe("+AED 4,950.00");
    expect(formatMoney(fils(0n), "en", { plus: true })).toBe("AED 0.00");
    expect(moneyParts(fils(495000n), true).sign).toBe("+");
  });

  it("isolates-amounts-in-arabic", () => {
    expect(formatMoney(fils(250000n), "en")).toBe("AED 2,500.00");
    expect(formatMoney(fils(250000n), "ar"))
      .toBe("⁦AED 2,500.00⁩");
  });
});
