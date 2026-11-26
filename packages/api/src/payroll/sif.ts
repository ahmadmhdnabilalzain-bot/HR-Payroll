import type { Payslip, SifBucket } from "@payroll/contract";
import { fils, type Fils } from "@payroll/engine";
import type { EvpInput, SifBatch, SifEmployee } from "@payroll/wps";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { leaveDays, periodBounds } from "../leave/days";
import { listEmployees } from "../people/employees";
import { dubaiDate, dubaiTime } from "../time/dubai";
import type { SnapshotEmployee } from "./compute";
import { loadRun } from "./pay-runs";
import { payslipsOfRun } from "./payslips";
import { openSnapshot } from "./snapshot";

type EvpBucket = Exclude<SifBucket, "fixed">;
const EVP: EvpBucket[] = ["housing", "conveyance", "medical", "passage",
  "overtime", "otherAllowances", "leaveEncashment"];

export interface SifInput {
  employerId: string | null;
  bankRoutingCode: string | null;
  period: { year: number; month: number };
  payslips: Payslip[];
  /** The approved run's employees: bank and labour id as approved. */
  snapshot: Map<string, SnapshotEmployee>;
  at: Date;
}

function sumOf(p: Payslip, keep: (b: SifBucket) => boolean): Fils {
  return fils(p.lines.filter((l) => keep(l.sifBucket))
    .reduce((n, l) => n + parseAed(l.amount), 0n));
}

function evpOf(p: Payslip, personId: string, routing: string): EvpInput {
  const by = (b: EvpBucket) => sumOf(p, (x) => x === b);
  return { personId, routingCode: routing, housing: by("housing"),
    conveyance: by("conveyance"), medical: by("medical"),
    passage: by("passage"), overtime: by("overtime"),
    otherAllowances: by("otherAllowances"),
    leaveEncashment: by("leaveEncashment") };
}

function employeeLine(p: Payslip, s: SnapshotEmployee,
  period: SifInput["period"]): SifEmployee {
  const { first, last } = periodBounds(period);
  const payStart = s.joiningDate > first ? s.joiningDate : first;
  const payEnd = s.lastWorkingDate !== null && s.lastWorkingDate < last
    ? s.lastWorkingDate : last;
  const personId = s.labourPersonId!;
  const routing = s.bank!.routingCode;
  const variable = sumOf(p, (b) => b !== "fixed");
  const edr = { personId, routingCode: routing, account: s.bank!.iban,
    payStart, payEnd, days: leaveDays(payStart, payEnd),
    fixed: sumOf(p, (b) => b === "fixed"), variable,
    unpaidLeaveDays: s.unpaidLeaveDays };
  return variable > 0n ? { edr, evp: evpOf(p, personId, routing) }
    : { edr };
}

/**
 * The SIF batch for an approved run: pay lines only (fixed bucket to
 * EDR fixed, the seven EVP buckets to variable and EVP); a leaver's
 * settlement is never included. Bank details and labour ids come from
 * the approved snapshot, never from live rows, so a change after
 * approval cannot redirect approved pay. Every employee missing them
 * is named, not just the first.
 */
export function buildSifBatch(i: SifInput): SifBatch {
  if (i.employerId === null || i.bankRoutingCode === null) {
    throw new ApiError("COMPANY_WPS_SETTINGS_MISSING");
  }
  const missing = i.payslips.filter((p) => {
    const e = i.snapshot.get(p.employeeId);
    return e === undefined || e.labourPersonId === null || e.bank === null;
  }).map((p) => p.employeeId);
  if (missing.length > 0) {
    throw new ApiError("EMPLOYEE_BANK_MISSING", undefined,
      { employeeIds: missing });
  }
  return { employerId: i.employerId, bankRoutingCode: i.bankRoutingCode,
    createdDate: dubaiDate(i.at), createdTime: dubaiTime(i.at).hhmmss,
    month: i.period,
    employees: i.payslips.map((p) => employeeLine(p,
      i.snapshot.get(p.employeeId)!, i.period)) };
}

/** Reads what buildSifBatch needs, in the request's transaction. */
export async function loadSifBatch(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string, at: Date): Promise<SifBatch> {
  const run = await loadRun(tx, companyId, runId);
  const [c] = await tx.query<{ wps_employer_id: string | null;
    wps_bank_routing: string | null }>(
    "SELECT wps_employer_id, wps_bank_routing FROM companies WHERE id = $1",
    [companyId]);
  const snap = await openSnapshot(tx, deps, companyId, run.id,
    run.snapshot_enc);
  return buildSifBatch({ employerId: c?.wps_employer_id ?? null,
    bankRoutingCode: c?.wps_bank_routing ?? null,
    period: { year: run.year, month: run.month },
    payslips: await payslipsOfRun(tx, deps, companyId, run.id),
    snapshot: new Map(snap.employees.map((e) => [e.employeeId, e])), at });
}

/**
 * Employees of the run whose live bank details or labour id differ
 * from the approved snapshot (or cannot be read): reported, not used.
 */
export async function bankDrift(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string): Promise<string[]> {
  const run = await loadRun(tx, companyId, runId);
  const snap = await openSnapshot(tx, deps, companyId, run.id,
    run.snapshot_enc);
  const live = new Map((await listEmployees(tx, deps, companyId))
    .map((e) => [e.id, e]));
  return snap.employees.filter((s) => {
    const e = live.get(s.employeeId);
    return e === undefined || e.unreadable.length > 0 ||
      e.labourPersonId !== s.labourPersonId ||
      e.bank?.iban !== s.bank?.iban ||
      e.bank?.routingCode !== s.bank?.routingCode;
  }).map((s) => s.employeeId);
}
