import type { Role } from "../../demo/state";

/**
 * Salary holds placed during the demo (WP16, R14). One slice in the
 * demo store, like papers-state.ts: each hold names who placed it,
 * their role and the demo's date; release is its undo. A hold keeps a
 * person's pay out of the bank advice; the salary file itself is not
 * rebuilt in the demo, and the screens say so.
 */
export interface SalaryHold {
  employeeId: string;
  reason: string;
  /** The employee the acting role stands for. */
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface HoldSlice {
  salaryHolds: SalaryHold[];
}

export type HoldAction =
  | { type: "salary-hold"; hold: SalaryHold }
  | { type: "salary-release"; employeeId: string };

export const HOLD_INITIAL: HoldSlice = { salaryHolds: [] };

export function reduceHolds<S extends HoldSlice>(s: S, a: HoldAction): S {
  switch (a.type) {
    case "salary-hold":
      return s.salaryHolds.some((h) => h.employeeId === a.hold.employeeId)
        ? s : { ...s, salaryHolds: [...s.salaryHolds, a.hold] };
    case "salary-release":
      return { ...s, salaryHolds: s.salaryHolds.filter((h) =>
        h.employeeId !== a.employeeId) };
  }
}

export const heldIdsOf = (s: HoldSlice): Set<string> =>
  new Set(s.salaryHolds.map((h) => h.employeeId));
