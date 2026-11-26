import type { Role } from "./state";

/**
 * Checks and saved views, one slice in the demo store, append-only
 * like planning-state.ts: a finding is marked reviewed or expected
 * with who, their role and the demo's date, and the mark has an undo.
 * A saved report view is a template plus the filter picked. Both live
 * in the demo only.
 */
export type CheckMark = "reviewed" | "expected";

export interface CheckNote {
  mark: CheckMark;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface SavedView {
  id: string;
  name: string;
  templateId: string;
  /** The month or department picked ("" when the template has none). */
  filter: string;
  by: string;
  role: Role;
  on: string;
}

export interface ChecksSlice {
  /** Finding id to its mark (absent: still to check). */
  checkMarks: Record<string, CheckNote>;
  savedViews: SavedView[];
  nextView: number;
}

export type ChecksAction =
  | { type: "check-mark"; id: string; employeeId: string; note: CheckNote }
  | { type: "check-unmark"; id: string; employeeId: string }
  | { type: "view-save"; view: Omit<SavedView, "id"> }
  | { type: "view-remove"; id: string };

export const CHECKS_INITIAL: ChecksSlice = { checkMarks: {},
  savedViews: [], nextView: 1 };

export function reduceChecks<S extends ChecksSlice>(s: S,
  a: ChecksAction): S {
  switch (a.type) {
    case "check-mark":
      return { ...s, checkMarks: { ...s.checkMarks, [a.id]: a.note } };
    case "check-unmark": {
      const { [a.id]: _gone, ...rest } = s.checkMarks;
      return { ...s, checkMarks: rest };
    }
    case "view-save":
      return { ...s, savedViews: [{ ...a.view, id: `view-${s.nextView}` },
        ...s.savedViews], nextView: s.nextView + 1 };
    case "view-remove":
      return { ...s, savedViews: s.savedViews.filter((v) =>
        v.id !== a.id) };
  }
}

/** Findings not yet marked. */
export const openChecks = (s: ChecksSlice, ids: readonly string[]):
  string[] => ids.filter((id) => s.checkMarks[id] === undefined);
