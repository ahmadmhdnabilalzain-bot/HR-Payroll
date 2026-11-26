import { describe, expect, it } from "vitest";
import { fils } from "../src/money";
import {
  computeGpssa,
  expectedFixingMonth,
  refuseGccNational,
} from "../src/payroll/gpssa";
import { loadGpssaParams, type GpssaRegime } from "../src/payroll/params";
import type { GpssaInput } from "../src/payroll/types";
import { validatePayslipInput } from "../src/payroll/validate";
import { GPSSA_PACKS } from "../src/rules/gpssa-pack";
import { TraceBuilder } from "../src/trace";
import {
  codeOf,
  detailOf,
  nationalFx,
  P,
  type FxPatch,
} from "./payroll-fixture";

const GP = GPSSA_PACKS[0]!;
const g = (regime: GpssaRegime, base: "basic" | "wage") =>
  loadGpssaParams(GP, { gpssaContributionSalaryBase: base }, regime);

interface Opts { regime?: GpssaRegime; base?: "basic" | "wage";
  patch?: FxPatch; gp?: Partial<GpssaInput> }

function run(o: Opts = {}) {
  const regime = o.regime ?? "dl57-2023";
  const input = nationalFx(o.patch ?? {}, { regime, ...o.gp });
  const t = new TraceBuilder();
  const w = validatePayslipInput(input, P);
  const r = computeGpssa(input, w, g(regime, o.base ?? "wage"), t);
  return { r, trace: t.lines() };
}

/** employee, employer gross, support, employer payable. */
const shares = (o: Opts) => {
  const { r } = run(o);
  return [r.employeeShare, r.employerGross, r.govSupport,
    r.employerPayable];
};
const basicOf = (n: bigint, regime: GpssaRegime = "dl57-2023"): Opts =>
  ({ regime, base: "basic", gp: { fixingBasic: fils(n) } });

describe("computeGpssa under Decree-Law 57", () => {
  it("charges 11% and 15% on the wage under DL57", () => {
    const { r } = run();
    expect(r.salary).toBe(1500000n);
    expect(shares({})).toEqual([165000n, 225000n, 37500n, 187500n]);
    expect(r.employerLine).toEqual({ traceId: "employer.gpssa",
      kind: "gpssa-employer", label: "Employer pension contribution",
      amount: 187500n });
    expect(r.partialLastMonthExempt).toBe(false);
  });
  it("charges on basic only when told so", () => {
    expect(run({ base: "basic" }).r.salary).toBe(1000000n);
    expect(shares({ base: "basic" }))
      .toEqual([110000n, 150000n, 25000n, 125000n]);
  });
  it("gives no support at exactly 20,000", () => {
    expect(shares(basicOf(2000000n)))
      .toEqual([220000n, 300000n, 0n, 300000n]);
  });
  it("gives support just below 20,000", () => {
    expect(shares(basicOf(1999999n)))
      .toEqual([220000n, 300000n, 50000n, 250000n]);
  });
  it("lifts a salary below 3,000 to the minimum", () => {
    for (const n of [299999n, 300000n]) {
      const { r } = run(basicOf(n));
      expect([r.salary, r.employeeShare]).toEqual([300000n, 33000n]);
    }
  });
  it("caps a salary above 70,000", () => {
    for (const n of [7000000n, 8000000n]) {
      const { r } = run(basicOf(n));
      expect([r.salary, r.employeeShare, r.employerGross, r.govSupport])
        .toEqual([7000000n, 770000n, 1050000n, 0n]);
    }
  });
  it("charges a partial last month in full under DL57", () => {
    const { r } = run({ patch: { employee: {
      leavingDate: "2026-06-15" } } });
    expect(r.employeeShare).toBe(165000n);
    expect(r.partialLastMonthExempt).toBe(false);
  });
  it("traces the salary with its inputs and base rule", () => {
    const { trace } = run();
    const s = trace.find((l) => l.id === "gpssa.salary");
    expect(s?.result).toBe("1500000");
    expect(s?.inputs).toMatchObject({ fixingMonth: "2026-01",
      raw: "1500000", min: "300000", max: "7000000", base: "wage",
      regime: "dl57-2023" });
    const base = s?.rules.find((x) =>
      x.key === "gpssaContributionSalaryBase");
    expect(base?.overridden).toBe(true);
    expect(trace.map((l) => l.id)).toEqual(["gpssa.salary",
      "gpssa.employer-gross", "gpssa.gov-support", "employer.gpssa"]);
  });
});

describe("computeGpssa under Law 7", () => {
  it("charges 5% and 15% under Law 7", () => {
    expect(shares(basicOf(1000000n, "law7-1999")))
      .toEqual([50000n, 150000n, 25000n, 125000n]);
    expect(shares(basicOf(6000000n, "law7-1999")))
      .toEqual([250000n, 750000n, 125000n, 625000n]);
    const floor = run(basicOf(50000n, "law7-1999")).r;
    expect([floor.salary, floor.employeeShare]).toEqual([100000n, 5000n]);
  });
  it("skips a partial last month under Law 7", () => {
    const o = basicOf(1000000n, "law7-1999");
    const part = run({ ...o, patch: { employee: {
      leavingDate: "2026-06-15" } } }).r;
    expect([part.employeeShare, part.employerGross, part.govSupport,
      part.employerPayable, part.employerLine.amount])
      .toEqual([0n, 0n, 0n, 0n, 0n]);
    expect(part.partialLastMonthExempt).toBe(true);
    const last = run({ ...o, patch: { employee: {
      leavingDate: "2026-06-30" } } }).r;
    expect(last.employeeShare).toBe(50000n);
    expect(last.partialLastMonthExempt).toBe(false);
  });
});

describe("fixing month", () => {
  it("expects January for an earlier joiner", () => {
    expect(expectedFixingMonth("2020-03-01", 2026)).toBe("2026-01");
    const fn = () => run({ gp: { fixingMonth: "2026-06" } });
    expect(codeOf(fn)).toBe("GPSSA_FIXING_MONTH");
    expect(detailOf(fn)).toMatchObject({ expected: "2026-01",
      value: "2026-06" });
  });
  it("refuses last year's January", () => {
    const fn = () => run({ patch: { month: 2 },
      gp: { fixingMonth: "2025-01" } });
    expect(codeOf(fn)).toBe("GPSSA_FIXING_MONTH");
    expect(detailOf(fn).expected).toBe("2026-01");
  });
  it("expects the joining month for a mid-year joiner", () => {
    expect(expectedFixingMonth("2026-06-30", 2026)).toBe("2026-06");
    expect(expectedFixingMonth("2026-01-20", 2026)).toBe("2026-01");
    expect(expectedFixingMonth("2025-11-20", 2026)).toBe("2026-01");
  });
});

describe("refuseGccNational", () => {
  it("refuses GCC nationals", () => {
    const fn = () => refuseGccNational(GP, undefined);
    expect(codeOf(fn)).toBe("UNSOURCED_PARAM");
    expect(detailOf(fn).key).toBe("gpssaGccNationalContribution");
    expect(codeOf(() => refuseGccNational(GP,
      { gpssaGccNationalContribution: "x" })))
      .toBe("UNSUPPORTED_WORKER_CLASS");
  });
});
