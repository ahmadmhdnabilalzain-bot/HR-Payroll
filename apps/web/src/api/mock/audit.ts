import type { AuditEvent, AuditVerifyResult } from "../contract";
import { canonical, sha256 } from "./sha256";

export type AuditInput = Omit<AuditEvent,
  "id" | "seq" | "prevHash" | "hash">;

export const GENESIS = "0".repeat(64);

/** Hash of an event's content and its predecessor's hash. */
export function hashOf(e: Omit<AuditEvent, "hash">): string {
  return sha256(canonical(e));
}

/** A new event chained after the current last one. */
export function nextEvent(
  chain: readonly AuditEvent[],
  input: AuditInput,
  id: string,
): AuditEvent {
  const last = chain[chain.length - 1];
  const body = { ...input, id, seq: (last?.seq ?? 0) + 1,
    prevHash: last?.hash ?? GENESIS };
  return { ...body, hash: hashOf(body) };
}

/** Recomputes the chain in order; the first bad event is reported. */
export function verifyChain(chain: readonly AuditEvent[]): AuditVerifyResult {
  let prev = GENESIS;
  for (const e of chain) {
    const { hash, ...body } = e;
    if (e.prevHash !== prev || hashOf(body) !== hash) {
      return { ok: false, checked: e.seq - 1, firstBadSeq: e.seq };
    }
    prev = hash;
  }
  return { ok: true, checked: chain.length, firstBadSeq: null };
}

/** Newest first, `before` a seq, as the contract pages it. */
export function pageOf(
  chain: readonly AuditEvent[],
  before: number | undefined,
  limit: number,
): { items: AuditEvent[]; nextBefore: number | null } {
  const older = chain.filter((e) => before === undefined || e.seq < before)
    .reverse();
  const items = older.slice(0, limit);
  const last = items[items.length - 1];
  const more = older.length > items.length && last !== undefined;
  return { items, nextBefore: more ? last.seq : null };
}
