import { add, fils, type Fils } from "@payroll/engine";
import {
  fromWirePayRunCreate,
  NOT_COMPUTED_PAY,
  toWirePayRun,
  toWirePayslip,
  type AppPayRun,
  type WirePayRunCreate,
} from "../contract";
import type { WireRequest } from "../transport";
import { param, signedIn, type Ctx, type Handler } from "./context";
import { MockFail, notFound } from "./fail";
import { computeRun } from "./pay";
import { canonical, sha256 } from "./sha256";
import { snapshotHash } from "./snapshot";
import { newId, record, replace } from "./state";

export function findRun(c: Ctx, id: string): AppPayRun {
  const run = c.s.runs.find((r) => r.id === id);
  if (run === undefined) throw notFound("pay run");
  return run;
}

/** The api's pay-run audit: `period`, plus extra data on create. */
function audit(
  c: Ctx, action: string, run: AppPayRun,
  extra: Record<string, string | number> = {},
): void {
  const period = { year: run.period.year, month: run.period.month };
  record(c.s, signedIn(c), { at: c.now, action, entityType: "pay-run",
    entityId: run.id, data: { period, ...extra } });
}

function inputHash(c: Ctx, run: AppPayRun): string {
  return snapshotHash({ period: run.period,
    entries: c.s.runEntries.get(run.id) ?? [], employees: c.s.employees,
    leave: c.s.leave, leaveTypes: c.s.leaveTypes });
}

function replayed(c: Ctx, key: string, hash: string): AppPayRun | null {
  const seen = c.s.idempotency.get(key);
  if (seen === undefined) return null;
  if (seen.hash !== hash) {
    throw new MockFail("IDEMPOTENCY_KEY_REUSED", "key used with another body");
  }
  return findRun(c, seen.runId);
}

function create(c: Ctx, r: WireRequest): AppPayRun {
  const wire = r.body as WirePayRunCreate;
  const key = r.headers?.["idempotency-key"] ?? "";
  const hash = sha256(canonical(wire));
  const again = replayed(c, key, hash);
  if (again !== null) return again;
  const { period } = wire;
  const exists = c.s.runs.find((x) => x.status !== "void" &&
    x.period.year === period.year && x.period.month === period.month);
  if (exists !== undefined) {
    throw new MockFail("RUN_EXISTS_FOR_PERIOD", "a run exists",
      { runId: exists.id });
  }
  const body = fromWirePayRunCreate(wire);
  const drafts = computeRun({ period, employees: c.s.employees,
    leave: c.s.leave, leaveTypes: c.s.leaveTypes, body });
  const id = newId(c.s, "run");
  const slips = drafts.map((d) => ({ ...d, id: newId(c.s, "payslip"),
    payRunId: id }));
  c.s.runEntries.set(id, wire.entries);
  const draft: AppPayRun = { id, period, status: "draft",
    createdBy: signedIn(c).id, approvedBy: null, createdAt: c.now,
    approvedAt: null, inputHash: "", employeeCount: slips.length,
    gross: slips.reduce((t: Fils, s) => add(t, s.gross), fils(0n)),
    notComputed: [...NOT_COMPUTED_PAY], sifFileId: null,
    reimbursementTotal: fils(0n), claimCount: 0, pendingClaimCount: 0,
    reimbursementNote: null };
  const run = { ...draft, inputHash: inputHash(c, draft) };
  c.s.runs = [...c.s.runs, run];
  c.s.payslips = [...c.s.payslips, ...slips];
  c.s.idempotency.set(key, { hash, runId: id });
  audit(c, "pay-run.created", run, { employeeCount: run.employeeCount,
    inputHash: run.inputHash });
  return run;
}

function approve(c: Ctx, id: string): AppPayRun {
  const run = findRun(c, id);
  const u = signedIn(c);
  if (run.status !== "draft") {
    throw new MockFail("RUN_NOT_DRAFT", "run is not a draft");
  }
  if (run.createdBy === u.id) {
    throw new MockFail("SOD_VIOLATION", "the creator cannot approve");
  }
  if (inputHash(c, run) !== run.inputHash) {
    throw new MockFail("RUN_INPUTS_CHANGED",
      "salaries or unpaid leave changed since the draft");
  }
  const next: AppPayRun = { ...run, status: "approved", approvedBy: u.id,
    approvedAt: c.now };
  c.s.runs = replace(c.s.runs, next);
  audit(c, "pay-run.approved", next);
  return next;
}

function voidRun(c: Ctx, id: string): AppPayRun {
  const run = findRun(c, id);
  if (run.status !== "draft") {
    throw new MockFail("RUN_NOT_DRAFT", "only a draft can be voided");
  }
  const next: AppPayRun = { ...run, status: "void" };
  c.s.runs = replace(c.s.runs, next);
  audit(c, "pay-run.voided", next);
  return next;
}

/**
 * Plan 3: owner and hr read any payslip; others only their own, and
 * only once its run is approved. Anything else is a 404, not a 403.
 */
function payslip(c: Ctx, id: string) {
  const p = c.s.payslips.find((x) => x.id === id);
  const u = signedIn(c);
  const payroll = u.role === "owner" || u.role === "hr";
  const own = p !== undefined && p.employeeId === u.employeeId &&
    c.s.runs.some((r) => r.id === p.payRunId && r.status === "approved");
  if (p === undefined || !(payroll || own)) throw notFound("payslip");
  return toWirePayslip(p);
}

export const PAYROLL_HANDLERS = {
  listPayRuns: (c) => ({ items: [...c.s.runs].reverse().map(toWirePayRun) }),
  getPayRun: (c, r) => toWirePayRun(findRun(c, param(r))),
  createPayRun: (c, r) => toWirePayRun(create(c, r)),
  approvePayRun: (c, r) => toWirePayRun(approve(c, param(r))),
  voidPayRun: (c, r) => toWirePayRun(voidRun(c, param(r))),
  listPayslips: (c, r) => ({ items: c.s.payslips
    .filter((p) => p.payRunId === findRun(c, param(r)).id)
    .map(toWirePayslip) }),
  getPayslip: (c, r) => payslip(c, param(r)),
} satisfies Record<string, Handler>;
