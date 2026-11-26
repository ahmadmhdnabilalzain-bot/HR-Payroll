import {
  RETENTION_NOTICE,
  RetentionClass,
  type DocumentType,
  type ExpiryAlert,
  type RetentionReport,
  type RetentionRule,
} from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { dubaiDate } from "../time/dubai";
import { isPayroll } from "./access";
import { expiryAlerts } from "./expiry";
import {
  retainUntil,
  retentionDue,
  type RetentionCandidate,
} from "./retention";
import { loadSettings } from "./settings";

interface SlotRow {
  id: string;
  employee_id: string;
  type: DocumentType;
  full_name: string;
  last_working_date: string | null;
  expiry_date: string | null;
  uploaded_at: string;
}

/** Each slot with its employee and its current version only. */
const SLOTS = `SELECT d.id, d.employee_id, d.type, e.full_name,
    e.last_working_date, v.expiry_date, v.uploaded_at
  FROM employee_documents d
  JOIN employees e ON e.company_id = d.company_id AND e.id = d.employee_id
  JOIN LATERAL (SELECT expiry_date, uploaded_at
    FROM employee_document_versions x WHERE x.company_id = d.company_id
      AND x.document_id = d.id ORDER BY x.version DESC LIMIT 1) v ON true
  WHERE d.company_id = $1`;

/** The caller's scope as SQL: all; self and direct reports; self. */
function scopeOf(ctx: ReqCtx): { where: string; args: string[] } | null {
  if (isPayroll(ctx)) return { where: "", args: [] };
  const own = ctx.tenant!.employeeId;
  if (own === null) return null;
  return ctx.tenant!.role === "manager"
    ? { where: " AND (e.id = $3 OR e.manager_id = $3)", args: [own] }
    : { where: " AND e.id = $3", args: [own] };
}

/**
 * GET /v1/document-alerts: current versions only, people who have not
 * left (no last working date, or one today or later), in scope.
 */
export async function documentAlerts(ctx: ReqCtx<unknown,
  { withinDays?: number }>): Promise<{ items: ExpiryAlert[] }> {
  const scope = scopeOf(ctx);
  if (scope === null) return { items: [] };
  const c = ctx.tenant!.companyId;
  const today = dubaiDate(ctx.deps.now());
  const rows = await ctx.tx.query<SlotRow>(`${SLOTS}
    AND (e.last_working_date IS NULL OR e.last_working_date >= $2)
    ${scope.where}`, [c, today, ...scope.args]);
  const settings = await loadSettings(ctx.tx, c);
  return { items: expiryAlerts(rows.map((r) => ({ documentId: r.id,
    employeeId: r.employee_id, employeeName: r.full_name, type: r.type,
    expiryDate: r.expiry_date })), settings.leadDays, today,
  ctx.query.withinDays) };
}

/** Letters join the report in Task 7 through this hook. */
export type ExtraCandidates = (ctx: ReqCtx,
  rule: (cls: RetentionClass) => RetentionRule)
  => Promise<RetentionCandidate[]>;

/** GET /v1/document-retention: a due list only; nothing is deleted. */
export async function retentionReport(ctx: ReqCtx,
  extra?: ExtraCandidates): Promise<RetentionReport> {
  const c = ctx.tenant!.companyId;
  const today = dubaiDate(ctx.deps.now());
  const { retention } = await loadSettings(ctx.tx, c);
  const rows = await ctx.tx.query<SlotRow>(SLOTS, [c]);
  const docs: RetentionCandidate[] = rows.map((r) => ({
    kind: "employee-document", id: r.id, employeeId: r.employee_id,
    retentionClass: r.type, retainUntil: retainUntil(retention[r.type], {
      employmentEnd: r.last_working_date, expiry: r.expiry_date,
      issue: dubaiDate(new Date(r.uploaded_at)) }) }));
  const more = extra === undefined ? []
    : await extra(ctx, (cls) => retention[cls]);
  return { asOf: today, due: retentionDue([...docs, ...more], today),
    unsetClasses: RetentionClass.options.filter((k) =>
      retention[k].months === null),
    notice: RETENTION_NOTICE };
}
