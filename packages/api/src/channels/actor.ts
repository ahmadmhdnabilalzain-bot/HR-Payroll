import type { Role } from "@payroll/contract";
import { userById } from "../auth/accounts";
import type { Via } from "../auth/session";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { Enter, ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

const NO_ENTER: Enter = () => {
  throw new Error("an actor context opens no transaction");
};

/**
 * A request context for a person acting through a channel (WhatsApp,
 * email-in) or a job, inside the caller's tenant transaction. The
 * session never has MFA, so it can never satisfy an MFA route.
 */
export async function actorCtx<B = unknown>(tx: Db, deps: HandlerDeps,
  companyId: string, userId: string, via: Via, body?: B)
  : Promise<ReqCtx<B>> {
  const user = await userById(tx, userId);
  const [m] = await tx.query<{ role: Role; employee_id: string | null }>(
    `SELECT role, employee_id FROM memberships
     WHERE company_id = $1 AND user_id = $2`, [companyId, userId]);
  if (user === null || m === undefined) {
    throw new ApiError("TENANT_FORBIDDEN");
  }
  return { deps, requestId: deps.newId(), user,
    session: { tokenHash: "", userId, mfa: false, via,
      expiresAt: deps.now().toISOString() },
    tenant: { companyId, role: m.role, employeeId: m.employee_id },
    tx, enter: NO_ENTER, params: {}, query: {}, headers: {},
    body: body as B };
}
