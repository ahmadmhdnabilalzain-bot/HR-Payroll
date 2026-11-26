import type { Payslip, Settlement } from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { sealerFor } from "../people/employees";
import type { ComputedPayslip } from "./compute";
import type { ComputedSettlement } from "./compute-settlement";

function settlementOut(s: ComputedSettlement | null): Settlement | null {
  if (s === null || s.status === "refused") return s;
  return { ...s, gratuity: toMoney(s.gratuity),
    leavePay: toMoney(s.leavePay), total: toMoney(s.total) };
}

/** Fils to the wire; the only place a computed payslip is serialised. */
export function toWirePayslip(id: string, payRunId: string,
  p: ComputedPayslip): Payslip {
  return {
    id, payRunId, employeeId: p.employeeId, employeeName: p.employeeName,
    period: p.period,
    lines: p.lines.map((l) => ({ code: l.code, label: l.label,
      amount: toMoney(l.amount), sifBucket: l.sifBucket, kind: l.kind,
      traceId: l.traceId })),
    gross: toMoney(p.gross), net: toMoney(p.net),
    notComputed: p.notComputed, settlement: settlementOut(p.settlement),
    trace: p.trace,
  };
}

export async function storePayslips(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string, ps: ComputedPayslip[]): Promise<void> {
  const sealer = await sealerFor(tx, deps, companyId, "payslips");
  for (const p of ps) {
    const id = deps.newId();
    const body = JSON.stringify(toWirePayslip(id, runId, p));
    await tx.query(
      `INSERT INTO payslips (id, company_id, pay_run_id, employee_id,
         body_enc, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, companyId, runId, p.employeeId,
        sealer.seal("body_enc", id, body), deps.now().toISOString()]);
  }
}

interface SlipRow {
  id: string;
  employee_id: string;
  body_enc: string;
  status: string;
}

async function readRows(tx: Db, deps: HandlerDeps, companyId: string,
  rows: SlipRow[]): Promise<Payslip[]> {
  const sealer = await sealerFor(tx, deps, companyId, "payslips");
  return rows.map((r) => JSON.parse(sealer.open("body_enc", r.id,
    r.body_enc)!) as Payslip);
}

const SELECT = `SELECT p.id, p.employee_id, p.body_enc, r.status
  FROM payslips p JOIN pay_runs r ON r.company_id = p.company_id
    AND r.id = p.pay_run_id`;

export async function payslipsOfRun(tx: Db, deps: HandlerDeps,
  companyId: string, runId: string): Promise<Payslip[]> {
  const rows = await tx.query<SlipRow>(`${SELECT}
    WHERE p.company_id = $1 AND p.pay_run_id = $2 ORDER BY p.id`,
  [companyId, runId]);
  return readRows(tx, deps, companyId, rows);
}

/** The caller's own payslips of approved runs. */
export async function myPayslips(tx: Db, deps: HandlerDeps, t: Tenant)
  : Promise<Payslip[]> {
  if (t.employeeId === null) return [];
  const rows = await tx.query<SlipRow>(`${SELECT}
    WHERE p.company_id = $1 AND p.employee_id = $2
      AND r.status = 'approved' ORDER BY r.year DESC, r.month DESC`,
  [t.companyId, t.employeeId]);
  return readRows(tx, deps, t.companyId, rows);
}

/** owner/hr: any payslip; others: their own, approved runs only. */
export async function payslipFor(tx: Db, deps: HandlerDeps, t: Tenant,
  id: string): Promise<Payslip> {
  const [r] = await tx.query<SlipRow>(`${SELECT}
    WHERE p.company_id = $1 AND p.id = $2`, [t.companyId, id]);
  const payroll = t.role === "owner" || t.role === "hr";
  const own = r !== undefined && r.employee_id === t.employeeId &&
    r.status === "approved";
  if (r === undefined || !(payroll || own)) throw new ApiError("NOT_FOUND");
  return (await readRows(tx, deps, t.companyId, [r]))[0]!;
}
