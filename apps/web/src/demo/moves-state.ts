import type { Role } from "./state";

/**
 * Hiring, joining and leaving: what was done during the demo. One
 * slice in the demo store, like leave-state.ts. Every step names who,
 * their role and the demo's date, and has an undo. Keys are plain:
 * `check:<list>:<item>`, `stage:<candidate>`, `offer:<offer>`,
 * `req:<requisition>`.
 */
export interface MoveStep {
  /** The new value: "done", a stage, an offer or requisition status. */
  value: string;
  /** The value before, so an undo restores it. */
  from: string;
  /** The employee the acting role stands for. */
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface NewEnding {
  id: string;
  employeeId: string;
  submittedOn: string;
  lastDay: string;
  reason: string;
  by: string;
  checkerId: string;
}

export interface NewMove {
  id: string;
  kind: "transfer" | "rejoin";
  employeeId: string;
  effectiveOn: string;
  toDepartment: string;
  toPlace: string;
  note: string;
  by: string;
  checkerId: string;
}

export interface MovesSlice {
  moveSteps: Record<string, MoveStep>;
  newEndings: NewEnding[];
  newMoves: NewMove[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextMove: number;
}

export type MovesAction =
  | { type: "move-step"; key: string; step: MoveStep }
  | { type: "move-undo"; key: string }
  | { type: "ending-new"; draft: Omit<NewEnding, "id"> }
  | { type: "ending-undo"; id: string }
  | { type: "staff-move-new"; draft: Omit<NewMove, "id"> }
  | { type: "staff-move-undo"; id: string };

export const MOVES_INITIAL: MovesSlice = { moveSteps: {}, newEndings: [],
  newMoves: [], nextMove: 1 };

export function reduceMoves<S extends MovesSlice>(s: S, a: MovesAction): S {
  switch (a.type) {
    case "move-step":
      return { ...s, moveSteps: { ...s.moveSteps, [a.key]: a.step } };
    case "move-undo": {
      const { [a.key]: _gone, ...rest } = s.moveSteps;
      return { ...s, moveSteps: rest };
    }
    case "ending-new": {
      const n = s.nextMove;
      return { ...s, newEndings: [{ ...a.draft, id: `end-new-${n}` },
        ...s.newEndings], nextMove: n + 1 };
    }
    case "ending-undo":
      return { ...s, newEndings: s.newEndings.filter((x) => x.id !== a.id) };
    case "staff-move-new": {
      const n = s.nextMove;
      return { ...s, newMoves: [{ ...a.draft, id: `move-new-${n}` },
        ...s.newMoves], nextMove: n + 1 };
    }
    case "staff-move-undo":
      return { ...s, newMoves: s.newMoves.filter((x) => x.id !== a.id) };
  }
}
