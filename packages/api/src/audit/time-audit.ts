import type { AuditEvent } from "@payroll/contract";
import { CodedError } from "../coded-error";
import type { Db } from "../db/db";
import { appendAudit, type AuditInput } from "./audit";

/**
 * Keys that must never reach a Plan 9 audit row: coordinates,
 * categories, notes, reasons and per-minute counts. Checked before
 * Plan 3's allowlist, which refuses every other unknown key.
 */
export const TIME_SENSITIVE_KEYS = ["lat", "lng", "point", "location",
  "coordinates", "distance", "category", "categories", "note", "reason",
  "minutes"] as const;

const DENY = new Set<string>(TIME_SENSITIVE_KEYS.map((k) =>
  k.toLowerCase()));

/** Every Plan 9 service audits through this. */
export async function timeAudit(tx: Db, e: AuditInput)
  : Promise<AuditEvent> {
  for (const k of Object.keys(e.data)) {
    if (DENY.has(k.toLowerCase())) {
      throw new CodedError("AUDIT_SENSITIVE_DATA",
        "time audit data may not carry this key", { key: k });
    }
  }
  return appendAudit(tx, e);
}
