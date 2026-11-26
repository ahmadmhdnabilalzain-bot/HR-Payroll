import { appendAudit, type AuditInput } from "../audit/audit";
import type { AuditEvent } from "@payroll/contract";
import { CodedError } from "../coded-error";
import type { Db } from "../db/db";

/**
 * Keys that never go into a Plan 13 audit row, at any depth: contact
 * details, secrets, message content and money.
 */
export const CHANNEL_SENSITIVE_KEYS: readonly string[] = ["phone", "email",
  "address", "to", "from", "token", "secret", "code", "signature", "body",
  "text", "subject", "url", "note", "reason", "payload", "amount", "iban"];

function assertNoChannelSecrets(v: unknown): void {
  if (Array.isArray(v)) {
    v.forEach(assertNoChannelSecrets);
    return;
  }
  if (v === null || typeof v !== "object") return;
  for (const [k, x] of Object.entries(v)) {
    if (CHANNEL_SENSITIVE_KEYS.includes(k)) {
      throw new CodedError("AUDIT_SENSITIVE_DATA",
        "channel audit data holds a sensitive key", { key: k });
    }
    assertNoChannelSecrets(x);
  }
}

/** Every Plan 13 service audits through this (then the allowlist). */
export async function channelAudit(tx: Db, e: AuditInput)
  : Promise<AuditEvent> {
  assertNoChannelSecrets(e.data);
  return appendAudit(tx, e);
}
