import type { Role, RouteDef } from "@payroll/contract";
import { UUID, withTenant } from "../db/tenant";
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

/** The caller's membership in the company named by X-Company-Id. */
export async function resolveTenant(
  deps: AppDeps,
  auth: Authed,
  header: string | undefined,
): Promise<Tenant> {
  if (header === undefined || header === "") {
    throw new ApiError("COMPANY_HEADER_REQUIRED");
  }
  if (!UUID.test(header)) {
    throw new ApiError("VALIDATION_FAILED", undefined,
      { fields: ["headers.x-company-id"] });
  }
  const companyId = header.toLowerCase();
  const [m] = await withTenant(deps.db, { companyId, userId: auth.user.id },
    (tx) => tx.query<{ role: Role; employee_id: string | null }>(
      `SELECT role, employee_id FROM memberships
       WHERE company_id = $1 AND user_id = $2`, [companyId, auth.user.id]));
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
