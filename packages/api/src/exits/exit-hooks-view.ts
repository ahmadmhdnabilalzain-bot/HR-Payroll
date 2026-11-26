import type { Exit } from "@payroll/contract";
import type { Db } from "../db/db";

/**
 * The leaver's in-app access: "no-login" when no membership of this
 * company is linked to the employee, else "not-revoked". (Revocation
 * arrives with the exit hooks.)
 */
export async function exitAccess(tx: Db, companyId: string,
  x: { employeeId: string }): Promise<Exit["access"]> {
  const rows = await tx.query(
    "SELECT 1 FROM memberships WHERE company_id = $1 AND employee_id = $2",
    [companyId, x.employeeId]);
  return { status: rows.length === 0 ? "no-login" : "not-revoked",
    at: null };
}

/** Document hook runs for the exit (none before the hooks exist). */
export async function exitDocuments(_tx: Db, _companyId: string,
  _exitId: string): Promise<Exit["documents"]> {
  return [];
}
