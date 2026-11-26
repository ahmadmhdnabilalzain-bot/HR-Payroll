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
  const rows = await tx.query<{ id: string; name: string; paid: boolean }>(
    "SELECT id, name, paid FROM leave_types WHERE company_id = $1",
    [companyId]);
  return new Map(rows.map((r) => [r.id, { name: r.name,
    payrollKind: r.paid ? "other-paid" : "unpaid" }]));
}

/** Health-related kinds: shown only to the person, manager, hr, owner. */
export const isHealthKind = (k: PayrollKind) =>
  k === "sick" || k === "maternity";
