import type { Fils } from "@payroll/engine";

/**
 * Prior-employment pay records entered during the demo (R25). One
 * slice in the demo store; lost on reload. Each record names who
 * entered it, in which role and on which demo day, and can be checked
 * by a second person or taken back.
 */
export interface PriorRecord {
  id: number;
  employeeId: string;
  employer: string;
  /** ISO dates of the earlier job, as typed in the form. */
  from: string;
  to: string;
  lastMonthly: Fils;
  /** A key of PRIOR_EVIDENCE. */
  evidence: string;
  by: string;
  role: string;
  /** ISO day of the demo. */
  on: string;
  checked: { by: string; role: string; on: string } | null;
}

export interface PriorSlice {
  priorRecords: PriorRecord[];
  nextPrior: number;
}

export type PriorDraft = Omit<PriorRecord, "id" | "checked">;

export type PriorAction =
  | { type: "prior-add"; draft: PriorDraft }
  | { type: "prior-check"; id: number;
    stamp: NonNullable<PriorRecord["checked"]> }
  | { type: "prior-uncheck"; id: number }
  | { type: "prior-undo"; id: number };

export const PRIOR_INITIAL: PriorSlice = { priorRecords: [], nextPrior: 1 };

export function reducePrior<S extends PriorSlice>(s: S, a: PriorAction): S {
  switch (a.type) {
    case "prior-add":
      return { ...s, priorRecords: [{ ...a.draft, id: s.nextPrior,
        checked: null }, ...s.priorRecords], nextPrior: s.nextPrior + 1 };
    case "prior-check":
      return { ...s, priorRecords: s.priorRecords.map((r) =>
        r.id === a.id ? { ...r, checked: a.stamp } : r) };
    case "prior-uncheck":
      return { ...s, priorRecords: s.priorRecords.map((r) =>
        r.id === a.id ? { ...r, checked: null } : r) };
    case "prior-undo":
      return { ...s, priorRecords: s.priorRecords.filter((r) =>
        r.id !== a.id) };
  }
}

/** The live record for a person, if one was entered. */
export const priorOf = (rs: readonly PriorRecord[], employeeId: string)
  : PriorRecord | undefined => rs.find((r) => r.employeeId === employeeId);
