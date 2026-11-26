import { parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fils, mulDiv, type Fils } from "../money";
import { requireParam } from "../rules/select";
import type { RulePack } from "../rules/types";
import type { TraceBuilder } from "../trace";
import type { TraceRule } from "../trace-types";
import type { GpssaParams, GpssaRegime, Overrides } from "./params";
import type {
  GpssaInput,
  PayslipInput,
  PayslipLine,
  PayWindow,
} from "./types";

export interface GpssaResult { salary: Fils; employeeShare: Fils;
  employerGross: Fils; govSupport: Fils; employerPayable: Fils;
  partialLastMonthExempt: boolean;
  employerLine: PayslipLine<"gpssa-employer">;
  /** The employee share's rules, carried onto the ded.gpssa line. */
  shareRules: TraceRule[]; regime: GpssaRegime }

/** January, or the joining month when joined in `year` after January. */
export function expectedFixingMonth(joiningDate: string,
  year: number): string {
  const j = parseIsoDate(joiningDate, "employee.joiningDate");
  const m = j.y === year && j.m > 1 ? j.m : 1;
  return `${year}-${String(m).padStart(2, "0")}`;
}

function gpssaOf(input: PayslipInput): GpssaInput {
  const g = input.employee.gpssa;
  if (g === null) {
    throw new EngineError("GPSSA_INPUT_REQUIRED",
      "a UAE national needs GPSSA input",
      { field: "employee.gpssa", value: "null" });
  }
  return g;
}

function checkFixingMonth(input: PayslipInput, g: GpssaInput): void {
  const expected = expectedFixingMonth(input.employee.joiningDate,
    input.year);
  if (g.fixingMonth !== expected) {
    throw new EngineError("GPSSA_FIXING_MONTH",
      `the contribution salary is fixed in ${expected} (January, or the ` +
        "joining month for a joiner after January)",
      { field: "employee.gpssa.fixingMonth", expected,
        value: g.fixingMonth });
  }
}

function contributionSalary(g: GpssaInput, p: GpssaParams,
  t: TraceBuilder): Fils {
  const raw = p.base.v === "basic" ? g.fixingBasic
    : g.fixingBasic + g.fixingAllowances;
  const min = p.minSalary.v;
  const max = p.maxSalary.v;
  const salary = fils(raw < min ? min : raw > max ? max : raw);
  t.add({ id: "gpssa.salary", label: "Pension contribution salary",
    formula: "fixingBasic (plus fixingAllowances when base is wage), " +
      "kept between min and max",
    inputs: { fixingMonth: g.fixingMonth, raw: String(raw),
      min: String(min), max: String(max), base: p.base.v,
      regime: p.regime },
    result: String(salary),
    rules: [p.base.rule, p.minSalary.rule, p.maxSalary.rule,
      p.fixingRule.rule] });
  return salary;
}

/** Law 7: nothing is due for the part of the month in which service ends. */
function exemptLastMonth(input: PayslipInput, w: PayWindow,
  p: GpssaParams): boolean {
  const leaving = input.employee.leavingDate;
  // Validation keeps leaving on or after monthStart.
  return p.lastMonth.v === "none-if-partial" && leaving !== null &&
    leaving < w.monthEnd;
}

interface Shares { employee: Fils; gross: Fils; support: Fils }

function shares(salary: Fils, exempt: boolean, p: GpssaParams): Shares {
  if (exempt) return { employee: fils(0n), gross: fils(0n),
    support: fils(0n) };
  const pct = (bps: bigint) => mulDiv(salary, bps, 10000n, p.rounding.v);
  const below = p.govSupportBelow;
  const supported = below === null || salary < below.v;
  return { employee: pct(p.employeeBps.v), gross: pct(p.employerBps.v),
    support: supported ? pct(p.govSupportBps.v) : fils(0n) };
}

/** The rules that set the contribution salary. */
const salaryRules = (p: GpssaParams): TraceRule[] => [p.base.rule,
  p.minSalary.rule, p.maxSalary.rule, p.fixingRule.rule];

const shareRulesOf = (p: GpssaParams): TraceRule[] => [p.employeeBps.rule,
  p.lastMonth.rule, p.rounding.rule, ...salaryRules(p)];

function traceShares(t: TraceBuilder, salary: Fils, s: Shares,
  payable: Fils, p: GpssaParams): void {
  const inputs = { salary: String(salary), lastMonth: p.lastMonth.v };
  const support = p.govSupportBelow === null ? [] : [p.govSupportBelow.rule];
  t.add({ id: "gpssa.employee-share", label: "Employee pension share",
    formula: "salary * employeeBps / 10000, 0 for an exempt last month",
    inputs: { ...inputs, employeeBps: String(p.employeeBps.v) },
    result: String(s.employee), rules: shareRulesOf(p) });
  t.add({ id: "gpssa.employer-gross", label: "Employer share before " +
    "government support", formula: "salary * employerBps / 10000",
    inputs: { ...inputs, employerBps: String(p.employerBps.v) },
    result: String(s.gross),
    rules: [p.employerBps.rule, p.lastMonth.rule, p.rounding.rule,
      p.base.rule] });
  t.add({ id: "gpssa.gov-support", label: "Government support",
    formula: "salary * govSupportBps / 10000 when salary is below the " +
      "threshold (none under Law 7), else 0",
    inputs: { ...inputs, govSupportBps: String(p.govSupportBps.v),
      below: p.govSupportBelow === null ? "none"
        : String(p.govSupportBelow.v) },
    result: String(s.support),
    rules: [p.govSupportBps.rule, ...support, p.rounding.rule,
      p.base.rule] });
  t.add({ id: "employer.gpssa", label: "Employer pension contribution",
    formula: "employer gross - government support",
    inputs: { gross: String(s.gross), support: String(s.support) },
    result: String(payable), rules: [p.employerBps.rule,
      p.govSupportBps.rule, p.lastMonth.rule, ...salaryRules(p)] });
}

/** Contributions on the fixed salary; not prorated (DL57 Art 11(3)). */
export function computeGpssa(input: PayslipInput, w: PayWindow,
  g: GpssaParams, t: TraceBuilder): GpssaResult {
  const gi = gpssaOf(input);
  checkFixingMonth(input, gi);
  const salary = contributionSalary(gi, g, t);
  const exempt = exemptLastMonth(input, w, g);
  const s = shares(salary, exempt, g);
  const payable = fils(s.gross - s.support);
  traceShares(t, salary, s, payable, g);
  return { salary, employeeShare: s.employee, employerGross: s.gross,
    govSupport: s.support, employerPayable: payable,
    partialLastMonthExempt: exempt,
    employerLine: { traceId: "employer.gpssa", kind: "gpssa-employer",
      label: "Employer pension contribution", amount: payable },
    shareRules: shareRulesOf(g), regime: g.regime };
}

const GCC_KEY = "gpssaGccNationalContribution";
const GCC_MESSAGE = "GCC national pension contributions are not " +
  "supported: no sourced rule exists";

/** As in the gratuity: GCC nationals are always refused. */
export function refuseGccNational(pack: RulePack, ov: Overrides): never {
  try {
    requireParam(pack, GCC_KEY, ov);
  } catch (e) {
    if (!(e instanceof EngineError) || e.code !== "UNSOURCED_PARAM") throw e;
    throw new EngineError("UNSOURCED_PARAM", GCC_MESSAGE,
      { ...e.detail, workerClass: "gcc-national" });
  }
  throw new EngineError("UNSUPPORTED_WORKER_CLASS", GCC_MESSAGE,
    { workerClass: "gcc-national", key: GCC_KEY });
}
