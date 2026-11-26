import type { Role } from "./state";

/**
 * Marks made on the safety and cover screens: an incident moved on, a
 * health card marked issued, a policy recorded as read. One append-only
 * slice in the demo store, like papers-state.ts: every mark names who,
 * their role and the demo's date, and has an undo. Keys are
 * "inc:<incident>", "card:<employee>" and "ack:<policy>:<employee>".
 */
export interface SafetyMark {
  /** The new status word key, e.g. "action-taken", "closed", "issued". */
  status: string;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface SafetySlice {
  safetyMarks: Record<string, SafetyMark>;
}

export type SafetyAction =
  | { type: "safety-mark"; key: string; mark: SafetyMark }
  | { type: "safety-unmark"; key: string };

export const SAFETY_INITIAL: SafetySlice = { safetyMarks: {} };

export function reduceSafety<S extends SafetySlice>(s: S, a: SafetyAction)
  : S {
  switch (a.type) {
    case "safety-mark":
      return { ...s, safetyMarks: { ...s.safetyMarks, [a.key]: a.mark } };
    case "safety-unmark": {
      const { [a.key]: _gone, ...rest } = s.safetyMarks;
      return { ...s, safetyMarks: rest };
    }
  }
}
