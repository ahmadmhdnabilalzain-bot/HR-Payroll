import type { AuditEvent } from "@payroll/contract";
import { CodedError } from "../coded-error";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { appendAudit, type AuditData, type AuditInput } from "./audit";

/**
 * Keys no Plan 8 audit event may carry, whatever the allowlist says:
 * comment bodies, reasons, notes, contact data and money.
 */
export const HR_SENSITIVE_KEYS = ["body", "reason", "note", "email",
  "phone", "salary", "settlement", "total", "gratuity", "leavePay"];

const DENIED = new Set(HR_SENSITIVE_KEYS.map((k) => k.toLowerCase()));

/** Every Plan 8 service audits through this. */
export async function hrAudit(tx: Db, e: AuditInput): Promise<AuditEvent> {
  for (const k of Object.keys(e.data)) {
    if (DENIED.has(k.toLowerCase())) {
      throw new CodedError("AUDIT_SENSITIVE_DATA",
        "audit data key is sensitive", { key: k });
    }
  }
  return appendAudit(tx, e);
}

/** `hrAudit` for a request: tenant company, caller and clock. */
export async function auditFor(ctx: ReqCtx, entityType: string,
  action: string, entityId: string, data: AuditData = {}): Promise<void> {
  await hrAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType, entityId, data });
}
