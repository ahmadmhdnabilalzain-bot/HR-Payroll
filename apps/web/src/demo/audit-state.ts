/**
 * The audit trail as the demo changes it: entries an action adds (a
 * key revoked, then restored: append only, nothing is ever taken
 * out), the last chain check run in this session and the "edit one
 * entry" demo. Shared by the Audit trail page and the IT dashboard.
 */
type AuditArea = "pay" | "people" | "time" | "access" | "setup";

export interface AuditAddition {
  /** Action code, e.g. "access.api-key-revoked". */
  action: string;
  area: AuditArea;
  actorId: string;
  /** The demo's date (ISO); the time follows the trail's last entry. */
  on: string;
  subject: { kind: string; id: string; label: string };
  summary: string;
}

/** The entry the "edit one entry" demo changes in its copy. */
export const TAMPER_AT = 11;

/** The demo clock: entries follow the trail's last entry, two minutes
 * apart, so the trail stays in time order (a new day starts at 09:00). */
export function auditDrafts(added: readonly AuditAddition[],
  lastAt: string) {
  let at = lastAt;
  return added.map((x) => {
    const day = at.slice(0, 10) === x.on;
    const from = day ? Number(at.slice(11, 13)) * 60 +
      Number(at.slice(14, 16)) : 9 * 60 - 2;
    const m = Math.min(from + 2, 23 * 60 + 59);
    at = `${x.on}T${String(Math.floor(m / 60)).padStart(2, "0")}:` +
      String(m % 60).padStart(2, "0");
    return { at, actorId: x.actorId, action: x.action, area: x.area,
      subject: x.subject, summary: x.summary };
  });
}

export interface AuditCheckResult {
  ok: boolean;
  brokenAt: number | null;
  checked: number;
}

export interface AuditSlice {
  auditAdded: AuditAddition[];
  /** Null until the chain is checked in this session (or since the
   * trail last changed). */
  auditCheck: AuditCheckResult | null;
  /** The "edit one entry" demo is on. */
  auditTampered: boolean;
}

export type AuditAction =
  | { type: "audit-append"; entry: AuditAddition }
  | { type: "audit-check"; result: AuditCheckResult }
  | { type: "audit-tamper"; on: boolean };

export const AUDIT_INITIAL: AuditSlice = { auditAdded: [],
  auditCheck: null, auditTampered: false };

/** A new entry or the tamper demo makes any earlier check out of date. */
export function reduceAudit<S extends AuditSlice>(s: S, a: AuditAction): S {
  switch (a.type) {
    case "audit-append": return { ...s, auditCheck: null,
      auditAdded: [...s.auditAdded, a.entry] };
    case "audit-check": return { ...s, auditCheck: a.result };
    case "audit-tamper": return { ...s, auditTampered: a.on,
      auditCheck: null };
  }
}
