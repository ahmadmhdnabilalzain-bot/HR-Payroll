import type { Db } from "../db/db";

export type PayrollKind = "annual" | "sick" | "maternity" | "unpaid" |
  "other-paid";

export interface TypeKind { name: string; payrollKind: PayrollKind }

/**
 * Every leave type's name and payroll kind. Without a policy row the
 * kind is "other-paid" for a paid type and "unpaid" otherwise.
 */
export async function leaveTypeKinds(tx: Db, companyId: string)
  : Promise<Map<string, TypeKind>> {
  const rows = await tx.query<{ id: string; name: string; paid: boolean;
    payroll_kind: PayrollKind | null }>(
    `SELECT t.id, t.name, t.paid, p.payroll_kind FROM leave_types t
     LEFT JOIN leave_policies p ON p.company_id = t.company_id
       AND p.leave_type_id = t.id WHERE t.company_id = $1`, [companyId]);
  return new Map(rows.map((r) => [r.id, { name: r.name,
    payrollKind: r.payroll_kind ?? (r.paid ? "other-paid" : "unpaid") }]));
}

/** Health-related kinds: shown only to the person, manager, hr, owner. */
export const isHealthKind = (k: PayrollKind) =>
  k === "sick" || k === "maternity";
