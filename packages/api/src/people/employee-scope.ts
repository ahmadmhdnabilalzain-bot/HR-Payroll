import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { inScope, viewerScope, type Viewer } from "./redact";

export interface EmployeeRef {
  id: string;
  managerId: string | null;
}

/**
 * The employee's id and manager when the viewer may see them (Plan 3
 * `viewerScope`); otherwise, or when absent, 404 NOT_FOUND.
 */
export async function employeeInScope(tx: Db, companyId: string,
  viewer: Viewer, employeeId: string): Promise<EmployeeRef> {
  const [r] = await tx.query<{ id: string; manager_id: string | null }>(
    "SELECT id, manager_id FROM employees WHERE company_id = $1 AND id = $2",
    [companyId, employeeId]);
  const ref = r === undefined ? null
    : { id: r.id, managerId: r.manager_id };
  if (ref === null || !inScope(viewerScope(viewer), ref)) {
    throw new ApiError("NOT_FOUND");
  }
  return ref;
}
