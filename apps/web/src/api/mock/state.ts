import type { MockOptions } from "./options";
import { nextEvent, type AuditInput } from "./audit";
import { buildSeed } from "./seed";
import { KIND, uid, type MockSeed, type MockUser } from "./seed-types";

export interface MockState extends MockSeed {
  /** Idempotency key to the body hash and the run it created. */
  idempotency: Map<string, { hash: string; runId: string }>;
  /** Users who started MFA enrolment. */
  pendingMfa: Set<string>;
  counter: number;
}

/** A fresh state per mock instance: nothing is shared or kept. */
export function createState(o: MockOptions): MockState {
  const seed = buildSeed(o.seed, o.today);
  const s = o.seedPatch === undefined ? seed : o.seedPatch(seed);
  return {
    ...s,
    users: s.users.map((u) => ({ ...u })),
    idempotency: new Map(),
    pendingMfa: new Set(),
    counter: 100000,
  };
}

export function newId(s: MockState, kind: keyof typeof KIND): string {
  s.counter += 1;
  return uid(KIND[kind], s.counter);
}

/** Every write leaves one chained audit event. */
export function record(
  s: MockState,
  actor: MockUser | null,
  input: Omit<AuditInput, "actorUserId">,
): void {
  const e = nextEvent(s.audit, { ...input, actorUserId: actor?.id ?? null },
    newId(s, "audit"));
  s.audit = [...s.audit, e];
}

/** Replaces the item with the same id; arrays are never mutated. */
export function replace<T extends { id: string }>(list: T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x));
}
