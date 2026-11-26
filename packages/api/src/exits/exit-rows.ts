import {
  NOTICE_FLAG_TEXT,
  type Exit,
  type ExitKind,
  type ExitSettlement,
  type ExitStatus,
  type NoticeFlag,
  type TraceLine,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { sealerFor, type Sealer } from "../people/employees";
import type { Viewer } from "../people/redact";
import { exitAccess, exitDocuments } from "./exit-hooks-view";

/** Decrypted, internal only. Serialise with `toExitView`. */
export interface ExitRow {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId: string | null;
  kind: ExitKind;
  status: ExitStatus;
  noticeGivenDate: string;
  noticeDays: number;
  lastWorkingDate: string;
  settlementDueDate: string;
  inProbation: boolean;
  flags: NoticeFlag[];
  noticeTrace: TraceLine[];
  reason: string | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  priorLastWorkingDate: string | null;
  settlement: ExitSettlement | null;
  settlementVersion: number;
  closedAt: string | null;
  createdAt: string;
}

interface DbRow {
  id: string; employee_id: string; full_name: string;
  manager_id: string | null; kind: ExitKind; status: ExitStatus;
  notice_given_date: string; notice_days: number;
  last_working_date: string; settlement_due_date: string;
  in_probation: boolean; flags: NoticeFlag[]; notice_trace: TraceLine[];
  reason_enc: string | null; requested_by: string;
  decided_by: string | null; decided_at: string | null;
  prior_last_working_date: string | null; settlement_enc: string | null;
  settlement_version: number; closed_at: string | null;
  created_at: string;
}

export const EXIT_SELECT = `SELECT x.*, e.full_name, e.manager_id
  FROM exits x JOIN employees e ON e.company_id = x.company_id
    AND e.id = x.employee_id
  WHERE x.company_id = $1`;

function fromDb(s: Sealer, r: DbRow): ExitRow {
  const plan = s.open("settlement_enc", r.id, r.settlement_enc);
  return { id: r.id, employeeId: r.employee_id, employeeName: r.full_name,
    managerId: r.manager_id, kind: r.kind, status: r.status,
    noticeGivenDate: r.notice_given_date, noticeDays: r.notice_days,
    lastWorkingDate: r.last_working_date,
    settlementDueDate: r.settlement_due_date, inProbation: r.in_probation,
    flags: r.flags, noticeTrace: r.notice_trace,
    reason: s.open("reason_enc", r.id, r.reason_enc),
    requestedBy: r.requested_by, decidedBy: r.decided_by,
    decidedAt: r.decided_at,
    priorLastWorkingDate: r.prior_last_working_date,
    settlement: plan === null ? null : JSON.parse(plan) as ExitSettlement,
    settlementVersion: r.settlement_version, closedAt: r.closed_at,
    createdAt: r.created_at };
}

export async function exitSealer(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<Sealer> {
  return sealerFor(tx, deps, companyId, "exits");
}

export async function exitRows(tx: Db, deps: HandlerDeps,
  companyId: string, where = "", args: unknown[] = []): Promise<ExitRow[]> {
  const rows = await tx.query<DbRow>(
    `${EXIT_SELECT}${where} ORDER BY x.created_at DESC, x.id`,
    [companyId, ...args]);
  const s = await exitSealer(tx, deps, companyId);
  return rows.map((r) => fromDb(s, r));
}

/** One exit, decrypted; 404 when absent. */
export async function loadExit(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, lock = false): Promise<ExitRow> {
  const rows = await tx.query<DbRow>(
    `${EXIT_SELECT} AND x.id = $2${lock ? " FOR UPDATE OF x" : ""}`,
    [companyId, id]);
  if (rows[0] === undefined) throw new ApiError("NOT_FOUND");
  return fromDb(await exitSealer(tx, deps, companyId), rows[0]);
}

const payroll = (v: Viewer) => v.role === "owner" || v.role === "hr";
const leaver = (v: Viewer, x: ExitRow) =>
  v.employeeId !== null && v.employeeId === x.employeeId;

/** Access, with the matched logins for owner and hr only. */
async function accessFor(tx: Db, companyId: string, x: ExitRow,
  pay: boolean): Promise<Exit["access"]> {
  const a = await exitAccess(tx, companyId, x);
  return pay ? a : { ...a, logins: [] };
}

/** The only serializer. Settlement and reason: owner, hr, the leaver. */
export async function toExitView(tx: Db, companyId: string, x: ExitRow,
  v: Viewer): Promise<Exit> {
  const full = payroll(v) || leaver(v, x);
  return { id: x.id, employeeId: x.employeeId,
    employeeName: x.employeeName, kind: x.kind, status: x.status,
    noticeGivenDate: x.noticeGivenDate, noticeDays: x.noticeDays,
    lastWorkingDate: x.lastWorkingDate,
    settlementDueDate: x.settlementDueDate, inProbation: x.inProbation,
    flags: x.flags.map((code) => ({ code, text: NOTICE_FLAG_TEXT[code] })),
    noticeTrace: x.noticeTrace, reason: full ? x.reason : null,
    requestedBy: x.requestedBy, decidedBy: x.decidedBy,
    decidedAt: x.decidedAt, settlement: full ? x.settlement : null,
    access: await accessFor(tx, companyId, x, payroll(v)),
    documents: await exitDocuments(tx, companyId, x.id),
    closedAt: x.closedAt, createdAt: x.createdAt };
}
