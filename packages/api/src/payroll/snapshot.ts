import type { PayRunCreate } from "@payroll/contract";
import { fils } from "@payroll/engine";
import { canonicalJson, sha256Hex } from "../audit/canonical";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { claimsForNewRun, claimsOfRun } from "../expenses/run-claims";
import { unpaidLeaveDaysIn } from "../leave/balances";
import { listEmployees, sealerFor } from "../people/employees";
import { inPeriod, type RunSnapshot, type SnapshotEmployee } from "./compute";

/**
 * Which approved claims a snapshot pays: for a new run, the approved
 * unlinked ones (minus exclusions); for a stored run, its linked ones.
 */
export type ClaimSource = { newRun: true } | { runId: string };

/**
 * Everything a run's arithmetic depends on, read in the request's
 * transaction: in-period employees with their recurring components
 * (salary version), approved unpaid leave days in the month, and the
 * approved expense claims it reimburses.
 */
export async function buildSnapshot(tx: Db, deps: HandlerDeps,
  companyId: string, body: PayRunCreate, source: ClaimSource)
  : Promise<RunSnapshot> {
  const rows = await listEmployees(tx, deps, companyId);
  const employees: SnapshotEmployee[] = [];
  for (const r of rows) {
    const e: SnapshotEmployee = { employeeId: r.id, name: r.fullName,
      joiningDate: r.joiningDate, lastWorkingDate: r.lastWorkingDate,
      workerClass: r.workerClass, salaryVersion: r.salaryVersion,
      components: (r.salary ?? []).map((c) => ({ code: c.code,
        label: c.label, amount: c.amount, sifBucket: c.sifBucket })),
      unpaidLeaveDays: 0 };
    if (!inPeriod(e, body.period)) continue;
    e.unpaidLeaveDays = await unpaidLeaveDaysIn(tx, companyId, r.id,
      body.period);
    employees.push(e);
  }
  const ids = employees.map((e) => e.employeeId);
  const reimbursements = "runId" in source
    ? await claimsOfRun(tx, companyId, source.runId)
    : await claimsForNewRun(tx, companyId, ids, body.excludeClaimIds ?? []);
  return { period: body.period, employees, entries: body.entries,
    reimbursements };
}

/** sha256 of the canonical JSON (bigint written as a string). */
export const snapshotHash = (s: RunSnapshot): string =>
  sha256Hex(canonicalJson(s));

export async function sealSnapshot(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string, s: RunSnapshot): Promise<string> {
  const sealer = await sealerFor(tx, deps, companyId, "pay_runs");
  return sealer.seal("snapshot_enc", runId, canonicalJson(s))!;
}

export async function openSnapshot(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string, cipher: string): Promise<RunSnapshot> {
  const sealer = await sealerFor(tx, deps, companyId, "pay_runs");
  const s = JSON.parse(sealer.open("snapshot_enc", runId, cipher)!) as
    RunSnapshot;
  for (const e of s.employees) {
    for (const c of e.components) c.amount = fils(BigInt(c.amount));
  }
  s.reimbursements = (s.reimbursements ?? []).map((r) => ({ ...r,
    amount: fils(BigInt(r.amount)) }));
  return s;
}
