import type { WfhConsent } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { getWfhSettings } from "./settings";

/**
 * Records a decision of the caller's own employee (the body has no
 * employee id). A grant or decline must name the current notice (409
 * NOTICE_VERSION_STALE); a withdrawal applies to the current one.
 */
export async function recordConsent(tx: Db, companyId: string,
  employeeId: string, version: number | null,
  decision: WfhConsent["decision"], ids: { id: string; at: string })
  : Promise<WfhConsent> {
  const s = await getWfhSettings(tx, companyId);
  if (s.noticeVersion === null) throw new ApiError("NOTICE_REQUIRED");
  if (version !== null && version !== s.noticeVersion) {
    throw new ApiError("NOTICE_VERSION_STALE");
  }
  await tx.query(
    `INSERT INTO wfh_consents (id, company_id, employee_id,
       notice_version, decision, at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [ids.id, companyId, employeeId, s.noticeVersion, decision, ids.at]);
  return { employeeId, noticeVersion: s.noticeVersion, decision,
    at: ids.at };
}

/**
 * Erasure at withdrawal (PDPL Art 15): the employee's closed pauses
 * and every tracking sample. Returns the number of sample rows.
 */
export async function eraseOnWithdraw(tx: Db, companyId: string,
  employeeId: string): Promise<number> {
  await tx.query("DELETE FROM wfh_pauses WHERE company_id = $1 AND " +
    "employee_id = $2 AND ended_at IS NOT NULL", [companyId, employeeId]);
  return eraseSamples(tx, companyId, employeeId);
}

/** Sample tables arrive with Task 10 (migration 908). */
async function eraseSamples(_tx: Db, _companyId: string,
  _employeeId: string): Promise<number> {
  return 0;
}
