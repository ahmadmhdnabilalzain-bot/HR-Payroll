import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

/**
 * An invite linked to an employee whose exit was closed after the
 * invite was issued is spent (Plan 8 review I-1): only an invite
 * issued after the exit can bring the person back. `issuedAt` is the
 * invite's expiry minus its lifetime.
 */
export async function assertInviteNotSpentByExit(tx: Db,
  companyId: string, inv: { employee_id: string | null },
  issuedAt: string): Promise<void> {
  if (inv.employee_id === null) return;
  const rows = await tx.query(
    `SELECT 1 FROM exits WHERE company_id = $1 AND employee_id = $2
     AND status = 'closed' AND created_at >= $3`,
    [companyId, inv.employee_id, issuedAt]);
  if (rows.length > 0) throw new ApiError("INVITE_USED");
}
