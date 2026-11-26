import type { ReceiptReport, ReceiptRow, Role } from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { dubaiDate } from "../time/dubai";
import { inAudience } from "./audience";
import { currentVersion, loadLib } from "./view";

interface PersonRow {
  id: string;
  full_name: string;
  department_id: string | null;
  role: Role | null;
  viewed_at: string | null;
  acknowledged_at: string | null;
}

/**
 * Everyone still employed today, with their user's role (if any) and
 * their receipt for one version (by employee, any user they had).
 */
const PEOPLE = `SELECT e.id, e.full_name, e.department_id, m.role,
    r.viewed_at, r.acknowledged_at
  FROM employees e
  LEFT JOIN memberships m ON m.company_id = e.company_id
    AND m.employee_id = e.id
  LEFT JOIN LATERAL (SELECT min(viewed_at) AS viewed_at,
      min(acknowledged_at) AS acknowledged_at FROM library_receipts x
    WHERE x.company_id = e.company_id AND x.version_id = $3
      AND x.employee_id = e.id) r ON true
  WHERE e.company_id = $1
    AND (e.last_working_date IS NULL OR e.last_working_date >= $2)
    AND e.joining_date <= $2`;

const statusOf = (p: PersonRow): ReceiptRow["status"] =>
  p.acknowledged_at !== null ? "acknowledged"
  : p.viewed_at !== null ? "viewed" : "pending";

/**
 * GET /v1/library/{id}/receipts (owner, hr): the current version's
 * receipts for the audience as it is today; leavers drop out, new
 * hires in the audience are pending. Sorted by name.
 */
export async function receiptReport(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<ReceiptReport> {
  const d = await loadLib(ctx, ctx.params.id);
  const v = await currentVersion(ctx, d.id);
  const today = dubaiDate(ctx.deps.now());
  const people = await ctx.tx.query<PersonRow>(PEOPLE,
    [ctx.tenant!.companyId, today, v.id]);
  const rows: ReceiptRow[] = people.filter((p) => inAudience(d.audience,
    { employeeId: p.id, departmentId: p.department_id, role: p.role }))
    .map((p) => ({ employeeId: p.id, employeeName: p.full_name,
      status: statusOf(p), viewedAt: p.viewed_at,
      acknowledgedAt: p.acknowledged_at }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "en") ||
      (a.employeeId < b.employeeId ? -1 : 1));
  const count = (s: ReceiptRow["status"]) =>
    rows.filter((r) => r.status === s).length;
  return { documentId: d.id, versionId: v.id, version: v.version, rows,
    counts: { acknowledged: count("acknowledged"), viewed: count("viewed"),
      pending: count("pending") } };
}
