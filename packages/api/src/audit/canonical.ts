import { createHash } from "node:crypto";
import { CodedError } from "../coded-error";

export const GENESIS_HASH = "0".repeat(64);

function canonicalNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new CodedError("CANONICAL_NUMBER", "non-finite number",
      { value: String(n) });
  }
  return JSON.stringify(n);
}

function canonicalObject(o: Record<string, unknown>): string {
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`);
  return `{${parts.join(",")}}`;
}

/**
 * Stable JSON: keys sorted by UTF-16 code unit, no whitespace, arrays
 * in order, bigint as a decimal string, undefined properties dropped.
 */
export function canonicalJson(v: unknown): string {
  if (v === null) return "null";
  switch (typeof v) {
    case "string":
    case "boolean":
      return JSON.stringify(v);
    case "number":
      return canonicalNumber(v);
    case "bigint":
      return JSON.stringify(v.toString());
    case "object":
      if (Array.isArray(v)) {
        return `[${v.map((x) => canonicalJson(x ?? null)).join(",")}]`;
      }
      return canonicalObject(v as Record<string, unknown>);
    default:
      throw new CodedError("CANONICAL_TYPE", `cannot encode ${typeof v}`);
  }
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export interface HashedEvent {
  seq: number;
  companyId: string;
  at: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  data: Record<string, unknown>;
}

/** sha256(prevHash + "\n" + canonical JSON of exactly these fields). */
export function eventHash(prevHash: string, e: HashedEvent): string {
  const body: HashedEvent = {
    seq: e.seq,
    companyId: e.companyId,
    at: e.at,
    actorUserId: e.actorUserId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    data: e.data,
  };
  return sha256Hex(`${prevHash}\n${canonicalJson(body)}`);
}
