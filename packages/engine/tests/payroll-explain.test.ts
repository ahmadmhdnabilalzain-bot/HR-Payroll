import { describe, expect, it } from "vitest";
import { MESSAGES, type Lang } from "../src/explain/catalog";
import { baseId, explainTrace } from "../src/explain/explain";
import {
  PAYROLL_AR,
  PAYROLL_EN,
  PAYROLL_MONEY_IDS,
} from "../src/explain/payroll-catalog";
import { fils } from "../src/money";
import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
} from "../src/payroll/payslip";
import type { DeductionKind, PayslipInput } from "../src/payroll/types";
import type { TraceLine } from "../src/trace-types";
import { absent, dates, fx, nationalFx } from "./payroll-fixture";

const WAGE = { gpssaContributionSalaryBase: "wage" };
const KINDS: DeductionKind[] = ["overpayment", "violation", "damage",
  "court-debt", "scheme"];
const trace = (i: PayslipInput, ov?: Record<string, string>) =>
  calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov).trace;

const TRACES: TraceLine[][] = [
  trace(fx()),
  trace(nationalFx(), WAGE),
  trace(fx({ overtime: [
    { date: "2026-06-10", minutes: 120, nightMinutes: 0 },
    { date: "2026-06-11", minutes: 60, nightMinutes: 60 }] })),
  trace(fx({ sickDaysUsedBefore: 10, absences: [
    ...absent("sick", dates("2026-06", 1, 10)),
    ...absent("maternity", dates("2026-06", 11, 15))] })),
  trace(fx({ restDayWork: [
    { date: "2026-06-06", kind: "rest-day", compensation: "pay" },
    { date: "2026-06-07", kind: "holiday", compensation: "day-off" }],
  encashLeaveDays: 5 })),
  trace(fx({ deductions: KINDS.map((kind, i) => ({ ref: `D${i}`, kind,
    amount: fils(10000n), consentOnFile: true })),
  loans: [{ ref: "L1", instalment: fils(10000n), balance: fils(50000n),
    consentOnFile: true }] })),
];
const LANGS: Lang[] = ["en", "ar"];

describe("payroll explanations", () => {
  it("has both languages for every payroll id", () => {
    expect(Object.keys(PAYROLL_AR).sort())
      .toEqual(Object.keys(PAYROLL_EN).sort());
    const ids = new Set(TRACES.flat().map((l) => baseId(l.id)));
    expect([...ids].sort()).toEqual(Object.keys(PAYROLL_EN).sort());
    for (const lang of LANGS) {
      for (const id of ids) {
        expect(MESSAGES[lang][id], `${lang} ${id}`).toBeTruthy();
      }
    }
  });
  it("never prints [untranslated]", () => {
    for (const lang of LANGS) {
      expect(explainTrace(TRACES.flat(), lang))
        .not.toContain("[untranslated]");
    }
  });
  it("fills every placeholder", () => {
    for (const lang of LANGS) {
      for (const line of explainTrace(TRACES.flat(), lang).split("\n")) {
        expect(line).not.toContain("{in.");
        expect(line).not.toMatch(/[{}]/);
      }
    }
  });
  it("formats money as AED", () => {
    const en = explainTrace(TRACES[0]!, "en");
    expect(en).toContain("Net pay: AED 15,000.00");
    expect(en).toContain("Pay period 2026-06-01 to 2026-06-30: 30 days");
    expect(PAYROLL_MONEY_IDS).toContain("pay.net");
    expect(PAYROLL_MONEY_IDS).not.toContain("payroll.days");
  });
  it("explains an item line", () => {
    const line = TRACES[0]!.find((l) => l.id === "earn.allowance#housing");
    expect(explainTrace([line!], "en"))
      .toContain("Allowance housing: AED 4,000.00");
    expect(baseId("ded.loan#L1")).toBe("ded.loan");
    expect(baseId("earn.basic")).toBe("earn.basic");
  });
  it("keeps amounts intact in Arabic", () => {
    expect(explainTrace(TRACES[0]!, "ar"))
      .toContain("⁦AED 15,000.00⁩");
  });
  it("makes no approval claim", () => {
    const all = [...Object.values(PAYROLL_EN), ...Object.values(PAYROLL_AR)]
      .join("\n");
    expect(all).not.toMatch(/approved|compliant|certified/i);
  });
});
