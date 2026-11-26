import type {
  AuditData,
  AuditEvent,
  AuditVerifyResult,
} from "@payroll/contract";
import { CodedError } from "../coded-error";
import { assertAllowedAuditData } from "./allowlist";
import { isoTimestamp, type Db } from "../db/db";
import { eventHash, GENESIS_HASH, type HashedEvent } from "./canonical";

export type { AuditData };

export interface AuditInput {
  companyId: string;
  at: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  data: AuditData;
}

/**
 * Callers record changed field names and named safe values only
 * (see allowlist.ts); anything else throws AUDIT_SENSITIVE_DATA.
 */
export function assertNoSensitive(data: Record<string, unknown>): void {
  assertAllowedAuditData(data);
}

interface EventRow {
  id: string;
  company_id: string;
  seq: bigint;
  at: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  data: AuditData;
  prev_hash: string;
  hash: string;
}

function hashedOf(r: EventRow): HashedEvent {
  return { seq: Number(r.seq), companyId: r.company_id, at: r.at,
    actorUserId: r.actor_user_id, action: r.action,
    entityType: r.entity_type, entityId: r.entity_id, data: r.data };
}

function toEvent(r: EventRow): AuditEvent {
  return { id: r.id, seq: Number(r.seq), at: r.at,
    actorUserId: r.actor_user_id, action: r.action,
    entityType: r.entity_type, entityId: r.entity_id, data: r.data,
    prevHash: r.prev_hash, hash: r.hash };
}

async function lockHead(tx: Db, companyId: string) {
  await tx.query(
    `INSERT INTO audit_heads (company_id, seq, hash) VALUES ($1, 0, $2)
     ON CONFLICT (company_id) DO NOTHING`, [companyId, GENESIS_HASH]);
  const [head] = await tx.query<{ seq: bigint; hash: string }>(
    "SELECT seq, hash FROM audit_heads WHERE company_id = $1 FOR UPDATE",
    [companyId]);
  if (head === undefined) throw new CodedError("AUDIT_HEAD", "no head");
  return { seq: Number(head.seq), hash: head.hash };
}

/** Appends one event in the caller's transaction. */
export async function appendAudit(
  tx: Db,
  e: AuditInput,
): Promise<AuditEvent> {
  assertNoSensitive(e.data);
  const head = await lockHead(tx, e.companyId);
  const hashed: HashedEvent = { ...e, at: isoTimestamp(e.at),
    seq: head.seq + 1 };
  const hash = eventHash(head.hash, hashed);
  const [row] = await tx.query<EventRow>(
    `INSERT INTO audit_events (company_id, seq, at, actor_user_id, action,
       entity_type, entity_id, data, prev_hash, hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [e.companyId, hashed.seq, hashed.at, e.actorUserId, e.action,
      e.entityType, e.entityId, JSON.stringify(e.data), head.hash, hash]);
  await tx.query(
    "UPDATE audit_heads SET seq = $2, hash = $3 WHERE company_id = $1",
    [e.companyId, hashed.seq, hash]);
  return toEvent(row!);
}

/** Recomputes every hash from the rows as stored. */
export async function verifyChain(
  tx: Db,
  companyId: string,
): Promise<AuditVerifyResult> {
  const rows = await tx.query<EventRow>(
    "SELECT * FROM audit_events WHERE company_id = $1 ORDER BY seq",
    [companyId]);
  let prev = GENESIS_HASH;
  for (const [i, r] of rows.entries()) {
    const bad = Number(r.seq) !== i + 1 || r.prev_hash !== prev ||
      r.hash !== eventHash(prev, hashedOf(r));
    if (bad) return { ok: false, checked: rows.length, firstBadSeq: i + 1 };
    prev = r.hash;
  }
  const [head] = await tx.query<{ seq: bigint; hash: string }>(
    "SELECT seq, hash FROM audit_heads WHERE company_id = $1", [companyId]);
  const headSeq = head === undefined ? 0 : Number(head.seq);
  if (headSeq !== rows.length || (head !== undefined && head.hash !== prev)) {
    return { ok: false, checked: rows.length, firstBadSeq: rows.length + 1 };
  }
  return { ok: true, checked: rows.length, firstBadSeq: null };
}
