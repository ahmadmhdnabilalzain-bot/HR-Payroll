import { add, fils, type Fils } from "@payroll/engine";
import {
  NOT_COMPUTED_PAY,
  type AppPayRunCreate,
  type AppPayRunEntry,
  type AppPayslip,
  type AppPayslipLine,
  type LeaveRequest,
  type LeaveType,
  type Period,
  type PayRunProblem,
  type TraceLine,
} from "../contract";
import { periodEnd, periodStart } from "./dates";
import { MockFail } from "./fail";
import type { MockEmployee } from "./seed-types";

/** A payslip before it gets its ids. */
export type SlipDraft = Omit<AppPayslip, "id" | "payRunId">;

export interface PayInput {
  period: Period;
  employees: readonly MockEmployee[];
  leave: readonly LeaveRequest[];
  leaveTypes: readonly LeaveType[];
  body: AppPayRunCreate;
}

const FORMULA: Record<AppPayslipLine["kind"], string> = {
  recurring: "entered monthly amount",
  override: "entered amount for this run",
  "one-off": "entered one-off amount",
};

/**
 * As the api: a leaver needs `unusedLeaveDays`. `serviceUnpaidLeaveDays`
 * is optional (omitted means 0, and a computed settlement says so).
 */
const SETTLEMENT_FIELDS = ["unusedLeaveDays"] as const;

export function inPeriod(e: MockEmployee, p: Period): boolean {
  return e.joiningDate <= periodEnd(p) &&
    (e.lastWorkingDate === null || e.lastWorkingDate >= periodStart(p));
}

const isLeaver = (e: MockEmployee, p: Period): boolean =>
  e.lastWorkingDate !== null && e.lastWorkingDate <= periodEnd(p);

function hasUnpaidLeave(e: MockEmployee, x: PayInput): boolean {
  const unpaid = new Set(x.leaveTypes.filter((t) => !t.paid)
    .map((t) => t.id));
  return x.leave.some((l) => l.employeeId === e.id &&
    l.status === "approved" && unpaid.has(l.leaveTypeId) &&
    l.startDate <= periodEnd(x.period) &&
    l.endDate >= periodStart(x.period));
}

/** Joined, left or took unpaid leave this month: amounts are entered. */
function isPartial(e: MockEmployee, x: PayInput): boolean {
  const p = x.period;
  const left = e.lastWorkingDate !== null &&
    e.lastWorkingDate < periodEnd(p);
  return e.joiningDate > periodStart(p) || left || hasUnpaidLeave(e, x);
}

function problemsFor(
  e: MockEmployee,
  entry: AppPayRunEntry | undefined,
  x: PayInput,
): PayRunProblem[] {
  const out: PayRunProblem[] = [];
  if (isPartial(e, x)) {
    const given = new Set(entry?.componentOverrides?.map((o) => o.code));
    const missing = (e.salary ?? []).map((c) => c.code)
      .filter((c) => !given.has(c));
    if (missing.length > 0) {
      out.push({ employeeId: e.id, code: "ENTERED_AMOUNTS_REQUIRED",
        missing });
    }
  }
  if (isLeaver(e, x.period)) {
    const missing = SETTLEMENT_FIELDS.filter((f) =>
      entry?.[f] === undefined);
    if (missing.length > 0) {
      out.push({ employeeId: e.id, code: "SETTLEMENT_INPUT_REQUIRED",
        missing });
    }
  }
  return out;
}

function linesFor(e: MockEmployee, entry: AppPayRunEntry | undefined) {
  const over = new Map(entry?.componentOverrides?.map((o) =>
    [o.code, o.amount]));
  for (const code of over.keys()) {
    if (!(e.salary ?? []).some((c) => c.code === code)) {
      throw new MockFail("VALIDATION_FAILED",
        `no salary component ${code} for this employee`,
        { employeeId: e.id, code });
    }
  }
  const lines: AppPayslipLine[] = (e.salary ?? []).map((c) => {
    const o = over.get(c.code);
    return { code: c.code, label: c.label, amount: o ?? c.amount,
      sifBucket: c.sifBucket, kind: o === undefined ? "recurring"
        : "override", traceId: `pay.${c.code}` };
  });
  for (const o of entry?.oneOffs ?? []) {
    lines.push({ ...o, kind: "one-off", traceId: `pay.${o.code}` });
  }
  const ids = lines.map((l) => l.traceId);
  if (new Set(ids).size !== ids.length) {
    throw new MockFail("DUPLICATE_COMPONENT", "a line code appears twice",
      { employeeId: e.id });
  }
  return lines;
}

/** One trace line per payslip line; result is integer fils. */
function traceOf(l: AppPayslipLine): TraceLine {
  return { id: l.traceId, label: l.label, formula: FORMULA[l.kind],
    inputs: l.kind === "recurring" ? { salaryVersion: "1" }
      : { entry: "pay run input" },
    result: l.amount.toString(), rules: [] };
}

function slipFor(
  e: MockEmployee,
  entry: AppPayRunEntry | undefined,
  p: Period,
): SlipDraft {
  const lines = linesFor(e, entry);
  const total = lines.reduce((s: Fils, l) => add(s, l.amount), fils(0n));
  return {
    employeeId: e.id, employeeName: e.fullName, period: p, lines,
    gross: total, net: total, notComputed: [...NOT_COMPUTED_PAY],
    settlement: isLeaver(e, p) ? { status: "refused",
      code: "MOCK_NOT_COMPUTED",
      message: "The offline demo does not compute settlements." } : null,
    trace: lines.map(traceOf),
  };
}

/**
 * Plan 3 Task 7 rules 1 to 6, except that the mock never computes a
 * settlement (Ruling W25). Throws PAY_RUN_PROBLEMS.
 */
export function computeRun(x: PayInput): SlipDraft[] {
  const entries = new Map(x.body.entries.map((e) => [e.employeeId, e]));
  const scope = x.employees.filter((e) => inPeriod(e, x.period));
  const ids = new Set(scope.map((e) => e.id));
  const problems: PayRunProblem[] = [...entries.keys()]
    .filter((id) => !ids.has(id))
    .map((id) => ({ employeeId: id, code: "EMPLOYEE_NOT_IN_PERIOD",
      missing: [] }));
  for (const e of scope) {
    if ((e.salary ?? []).length === 0) {
      problems.push({ employeeId: e.id, code: "SALARY_MISSING",
        missing: ["salary"] });
    } else problems.push(...problemsFor(e, entries.get(e.id), x));
  }
  if (problems.length > 0) {
    throw MockFail.problems(problems);
  }
  return scope.map((e) => slipFor(e, entries.get(e.id), x.period));
}
