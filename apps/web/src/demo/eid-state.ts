import type { Role } from "./state";

/**
 * Showing one Emirates ID in full. The number stays masked everywhere
 * (and in every CSV); HR may press Show on one profile, which writes an
 * entry to this append-only log (who, role, whose, the demo's date) and
 * shows that one person's number until HR leaves the profile.
 */
export interface EidEntry {
  employeeId: string;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface EidSlice {
  eidLog: EidEntry[];
  /** The one person whose number is on screen now, or null. */
  eidShown: string | null;
}

export type EidAction =
  | { type: "eid-show"; entry: EidEntry }
  | { type: "eid-hide" };

export const EID_INITIAL: EidSlice = { eidLog: [], eidShown: null };

export function reduceEid<S extends EidSlice>(s: S, a: EidAction): S {
  switch (a.type) {
    case "eid-show":
      return { ...s, eidLog: [...s.eidLog, a.entry],
        eidShown: a.entry.employeeId };
    case "eid-hide":
      return s.eidShown === null ? s : { ...s, eidShown: null };
  }
}
