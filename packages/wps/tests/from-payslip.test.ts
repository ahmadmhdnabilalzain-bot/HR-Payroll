import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  expectedFixingMonth,
  fils,
  type AllowanceKind,
  type DeductionKind,
  type PayslipInput,
} from "@payroll/engine";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { payslipToSifEmployee } from "../src/from-payslip";
import { generateSif } from "../src/generate";
import { validateSif } from "../src/validate";

const BANK = { personId: "00915012345663", routingCode: "802420101",
  account: "AE400240043520123456701" };

type Patch = Partial<Omit<PayslipInput, "employee">> & {
  employee?: Partial<PayslipInput["employee"]> };

/** The engine's FX fixture, rebuilt (its test helper is not exported). */
function fx(patch: Patch = {}): PayslipInput {
  const { employee, ...top } = patch;
  return { year: 2026, month: 6,
    employee: { workerClass: "expat-full-time", joiningDate: "2020-03-01",
      leavingDate: null, probationEndDate: null, shiftWorker: false,
      normalHoursPerDay: 8, basicMonthly: fils(1000000n), gpssa: null,
      allowances: [
        { code: "housing", kind: "housing", monthly: fils(400000n) },
        { code: "transport", kind: "conveyance", monthly: fils(100000n) }],
      ...employee },
    absences: [], sickDaysUsedBefore: 0, maternityDaysUsedBefore: 0,
    overtime: [], restDayWork: [], encashLeaveDays: 0, deductions: [],
    loans: [], ...top };
}

const slip = (i: PayslipInput, ov?: Record<string, string>) =>
  calculatePayslip(i, DEFAULT_PAYROLL_PACKS, ov).value;
const adapt = (i: PayslipInput) => payslipToSifEmployee(slip(i), BANK);
const ded = (ref: string, kind: DeductionKind, amount: bigint) =>
  ({ ref, kind, amount: fils(amount), consentOnFile: true });

describe("payslipToSifEmployee", () => {
  it("maps a full month", () => {
    const e = adapt(fx());
    expect(e.edr).toEqual({ ...BANK, payStart: "2026-06-01",
      payEnd: "2026-06-30", days: 30, fixed: 1000000n, variable: 500000n,
      unpaidLeaveDays: 0 });
    expect(e.evp).toEqual({ personId: BANK.personId,
      routingCode: BANK.routingCode, housing: 400000n, conveyance: 100000n,
      medical: 0n, passage: 0n, overtime: 0n, otherAllowances: 0n,
      leaveEncashment: 0n });
  });
  it("takes deductions from basic first", () => {
    const e = adapt(fx({ deductions: [ded("O1", "overpayment", 300000n)] }));
    expect([e.edr.fixed, e.edr.variable]).toEqual([700000n, 500000n]);
  });
  it("spills deductions into allowances", () => {
    const e = adapt(fx({ employee: { basicMonthly: fils(400000n),
      allowances: [{ code: "housing", kind: "housing",
        monthly: fils(600000n) }] },
    deductions: [ded("C1", "court-debt", 250000n),
      ded("O1", "overpayment", 200000n)] }));
    expect([e.edr.fixed, e.edr.variable]).toEqual([0n, 550000n]);
    expect(e.evp?.housing).toBe(550000n);
  });
  it("follows the deduction order past the first bucket", () => {
    const e = adapt(fx({ employee: { basicMonthly: fils(400000n),
      allowances: [
        { code: "other", kind: "other", monthly: fils(300000n) },
        { code: "housing", kind: "housing", monthly: fils(300000n) }] },
    deductions: [ded("C1", "court-debt", 250000n),
      ded("O1", "overpayment", 200000n)] }));
    expect(e.edr.fixed).toBe(0n);
    expect(e.evp).toMatchObject({ otherAllowances: 250000n,
      housing: 300000n });
    expect(e.edr.variable).toBe(550000n);
  });
  it("puts overtime in the overtime field", () => {
    const e = adapt(fx({ overtime: [
      { date: "2026-06-10", minutes: 120, nightMinutes: 0 },
      { date: "2026-06-11", minutes: 60, nightMinutes: 60 }] }));
    expect(e.evp?.overtime).toBe(16667n);
    expect(e.edr.variable).toBe(516667n);
  });
  it("reports unpaid days", () => {
    const e = adapt(fx({ absences: ["02", "03", "04"].map((d) =>
      ({ date: `2026-06-${d}`, kind: "unpaid" as const })) }));
    expect(e.edr.unpaidLeaveDays).toBe(3);
    expect(e.edr.fixed).toBe(900000n);
  });
  it("omits the EVP without variable pay", () => {
    const e = adapt(fx({ employee: { allowances: [] } }));
    expect(e.evp).toBeUndefined();
    expect("evp" in e).toBe(false);
    expect(e.edr.variable).toBe(0n);
  });
  it("produces a file with no errors", () => {
    const r = generateSif({ employerId: "0000000123456",
      bankRoutingCode: "802420101", createdDate: "2026-07-01",
      createdTime: "093000", month: { year: 2026, month: 6 },
      employees: [adapt(fx())] });
    const errors = validateSif(r.text, undefined, "2026-07-01")
      .filter((f) => f.severity === "error");
    expect(errors).toEqual([]);
  });
});

const KINDS: AllowanceKind[] = ["housing", "conveyance", "medical",
  "passage", "other"];
const DEDS: DeductionKind[] = ["overpayment", "violation", "damage",
  "court-debt", "scheme"];
const money = (min: bigint, max: bigint) =>
  fc.bigInt({ min, max }).map((v) => fils(v));

/** A Task 7 style payslip input in June 2026, valid by construction. */
const caseArb = fc.record({
  basic: money(1n, 1000000000n),
  allowances: fc.array(fc.record({ kind: fc.constantFrom(...KINDS),
    monthly: money(0n, 1000000000n) }), { maxLength: 3 }),
  join: fc.integer({ min: 0, max: 30 }),
  marks: fc.array(fc.constantFrom("none", "unpaid", "sick", "overtime",
    "rest"), { minLength: 30, maxLength: 30 }),
  sick: fc.integer({ min: 0, max: 120 }),
  encash: fc.integer({ min: 0, max: 5 }),
  deductions: fc.array(fc.record({ kind: fc.constantFrom(...DEDS),
    amount: money(1n, 1000000000n) }), { maxLength: 4 }),
  loans: fc.array(fc.record({ instalment: money(1n, 1000000000n),
    balance: money(0n, 1000000000n) }), { maxLength: 2 }),
  national: fc.boolean(),
}).map((r) => {
  const from = Math.max(r.join, 1);
  const joiningDate = r.join === 0 ? "2020-03-01"
    : `2026-06-${String(r.join).padStart(2, "0")}`;
  const ds = r.marks.map((m, i) => ({ m, date:
    `2026-06-${String(i + 1).padStart(2, "0")}` })).slice(from - 1);
  const pick = (m: string) => ds.filter((d) => d.m === m);
  const input = fx({ employee: { basicMonthly: r.basic, joiningDate,
    allowances: r.allowances.map((a, i) => ({ code: `A${i}`, ...a })),
    workerClass: r.national ? "uae-national" : "expat-full-time",
    gpssa: r.national ? { regime: "dl57-2023", fixingBasic: r.basic,
      fixingAllowances: fils(0n), arrears: fils(0n),
      fixingMonth: expectedFixingMonth(joiningDate, 2026) } : null },
  absences: [...pick("unpaid").map((d) => ({ date: d.date,
    kind: "unpaid" as const })), ...pick("sick").map((d) => ({
    date: d.date, kind: "sick" as const }))],
  overtime: pick("overtime").slice(0, 3).map((d) => ({ date: d.date,
    minutes: 150, nightMinutes: 30 })),
  restDayWork: pick("rest").map((d) => ({ date: d.date,
    kind: "rest-day" as const, compensation: "pay" as const })),
  sickDaysUsedBefore: r.sick, encashLeaveDays: r.encash,
  deductions: r.deductions.map((d, i) => ({ ref: `D${i}`,
    consentOnFile: true, ...d })),
  loans: r.loans.map((l, i) => ({ ref: `L${i}`, consentOnFile: true,
    ...l })) });
  return slip(input, r.national
    ? { gpssaContributionSalaryBase: "basic" } : undefined);
});

describe("payslipToSifEmployee properties", () => {
  it("keeps net, EVP parts and signs consistent", () => {
    fc.assert(fc.property(caseArb, (s) => {
      const { edr, evp } = payslipToSifEmployee(s, BANK);
      expect(edr.fixed + edr.variable).toBe(s.net);
      const parts = evp === undefined ? [] : [evp.housing, evp.conveyance,
        evp.medical, evp.passage, evp.overtime, evp.otherAllowances,
        evp.leaveEncashment];
      expect(parts.reduce((a, b) => a + b, 0n)).toBe(edr.variable);
      for (const v of [edr.fixed, edr.variable, ...parts]) {
        expect(v >= 0n).toBe(true);
      }
      expect(evp !== undefined).toBe(edr.variable > 0n);
    }), { numRuns: 200 });
  });
});
