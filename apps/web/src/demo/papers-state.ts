import type { LetterKind } from "./data/papers-types";
import type { Role } from "./state";

/**
 * Decisions and new items on the People papers screens (staff
 * requests, letters, visa cases, warnings). One slice in the demo
 * store, like leave-state.ts: every decision names who, their role
 * and the demo's date, and has an undo.
 */
export interface PaperStep {
  /** The new status word key, e.g. "done", "declined", "issued". */
  status: string;
  /** The employee the acting role stands for. */
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface NewRequest {
  id: string;
  kind: string;
  title: string;
  employeeId: string;
  note: string;
  raisedOn: string;
  by: string;
}

export interface NewLetter {
  id: string;
  kind: LetterKind;
  employeeId: string;
  purpose: string;
  addressee: string;
  requestedOn: string;
  /** Who signs it (the General manager). */
  checkerId: string;
  by: string;
}

export interface PapersSlice {
  /** Record id (or "visa#stage") to the latest step taken on it. */
  steps: Record<string, PaperStep>;
  newRequests: NewRequest[];
  newLetters: NewLetter[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextPaper: number;
}

export type PapersAction =
  | { type: "paper-step"; id: string; step: PaperStep }
  | { type: "paper-undo"; id: string }
  | { type: "request-new"; draft: Omit<NewRequest, "id"> }
  | { type: "letter-new"; draft: Omit<NewLetter, "id"> };

export const PAPERS_INITIAL: PapersSlice = { steps: {}, newRequests: [],
  newLetters: [], nextPaper: 1 };

export function reducePapers<S extends PapersSlice>(s: S, a: PapersAction)
  : S {
  switch (a.type) {
    case "paper-step":
      return { ...s, steps: { ...s.steps, [a.id]: a.step } };
    case "paper-undo": {
      const { [a.id]: _gone, ...rest } = s.steps;
      return { ...s, steps: rest };
    }
    case "request-new":
      return { ...s, newRequests: [{ ...a.draft,
        id: `rq-new-${s.nextPaper}` }, ...s.newRequests],
      nextPaper: s.nextPaper + 1 };
    case "letter-new":
      return { ...s, newLetters: [{ ...a.draft,
        id: `lt-new-${s.nextPaper}` }, ...s.newLetters],
      nextPaper: s.nextPaper + 1 };
  }
}
