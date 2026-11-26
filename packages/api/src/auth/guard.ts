import type { Role, RouteDef } from "@payroll/contract";
import type { Db } from "../db/db";
import { withTenant } from "../db/tenant";
import type { AppDeps } from "../deps";
import { ApiError } from "../http/errors";
import { userById, type UserRow } from "./accounts";
import { findSession, type Session } from "./session";

export interface Authed {
  user: UserRow;
  session: Session;
}

export interface Tenant {
  companyId: string;
  role: Role;
  employeeId: string | null;
  /** Set for API key callers: what the key may see (Task 9). */
  apiScopes?: readonly string[];
}

const BEARER = /^Bearer ([A-Za-z0-9_-]{16,200})$/;

/** A live session and its user, else 401 UNAUTHENTICATED. */
export async function authenticate(
  deps: AppDeps,
  header: string | undefined,
): Promise<Authed> {
  const token = BEARER.exec(header ?? "")?.[1];
  if (token === undefined) throw new ApiError("UNAUTHENTICATED");
  const found = await withTenant(deps.db, { companyId: null,
    userId: null }, async (tx) => {
    const session = await findSession(tx, token, deps.now());
    if (session === null) return null;
    const user = await userById(tx, session.userId);
    return user === null ? null : { user, session };
  });
  if (found === null) throw new ApiError("UNAUTHENTICATED");
  return found;
}

/**
 * The caller's membership in `companyId`, read in the request's own
 * tenant transaction (so the check and the handler see one snapshot).
 * A revoked membership (Plan 8 exit) counts as none: 403, at once,
 * even for a session that is still valid.
 */
export async function resolveTenant(
  tx: Db,
  auth: Authed,
  companyId: string,
): Promise<Tenant> {
  const [m] = await tx.query<{ role: Role; employee_id: string | null }>(
    `SELECT role, employee_id FROM memberships
     WHERE company_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [companyId, auth.user.id]);
  if (m === undefined) throw new ApiError("TENANT_FORBIDDEN");
  return { companyId, role: m.role, employeeId: m.employee_id };
}

export function checkRole(def: RouteDef, tenant: Tenant): void {
  if (!def.roles.includes(tenant.role)) throw new ApiError("FORBIDDEN");
}

export function checkMfa(def: RouteDef, auth: Authed): void {
  if (!def.mfa || auth.session.mfa) return;
  throw new ApiError(auth.user.mfa_enrolled ? "MFA_REQUIRED"
    : "MFA_ENROLMENT_REQUIRED");
}
