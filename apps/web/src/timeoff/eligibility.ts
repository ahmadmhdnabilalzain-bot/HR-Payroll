import type { LeaveTypeView, Person } from "../demo/data/people-types";

/**
 * Who may take a leave type. Maternity leave is for female employees
 * (Decree-Law 33, Article 30); parental leave is for either parent
 * (Article 32); the rest are for everyone. The list of types itself
 * stays whole: existing requests are named from it.
 */
export function mayTake(t: LeaveTypeView, p: Person | null): boolean {
  return t.rule.onlyFor === null || p?.gender === t.rule.onlyFor;
}

/** The types a person may ask for, and the ones held back. */
export function typesFor(types: readonly LeaveTypeView[],
  p: Person | null): { open: LeaveTypeView[]; closed: LeaveTypeView[] } {
  return { open: types.filter((t) => mayTake(t, p)),
    closed: types.filter((t) => !mayTake(t, p)) };
}
