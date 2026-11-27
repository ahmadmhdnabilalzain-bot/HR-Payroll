import type { RequestStatus, Urgency } from "./data/hiring-types";
import type { MovesSlice, MoveStep } from "./moves-state";
import type { Role } from "./state";

/**
 * Hiring budget and hiring requests: what was done during the demo,
 * one slice in the demo store, append only like papers-state.ts. A
 * request raised, a step (sent for sign-off, signed off, declined,
 * changes asked, on hold, withdrawn), a message in the request's
 * thread, an HR edit and a budget ask each name who, their role and
 * the demo's date, and each has an undo. Ids come from one counter in
 * the reducer, so StrictMode stays sound.
 */

export interface HiringDraft {
  jobKey: string;
  departmentId: string;
  /** The budgeted position it fills, or null for a new position. */
  budgetId: string | null;
  reason: "new" | "replacement";
  replacesName: string;
  headcount: number;
  startIso: string;
  urgency: Urgency;
  timeToFillDays: number;
  grade: number;
  jobDescription: string;
  mustHave: string[];
  niceToHave: string[];
  stages: { name: string; panel: { id: string; name: string }[] }[];
  hiringManagerId: string;
}

interface Who { by: string; role: Role; on: string }

export interface NewHireRequest extends HiringDraft, Who {
  id: string;
  /** Its number in the year, after the seeded ones. */
  n: number;
}

export interface HiringStep extends Who {
  id: string;
  requestId: string;
  to: RequestStatus;
  from: RequestStatus;
  /** Why (asked for changes, declined, on hold); may be empty. */
  note: string;
  /** A request tied to a requisition moves it too (the Requisitions
   * overlay, `req:<id>`); the undo puts back what was there. */
  req: { key: string; set: MoveStep; before: MoveStep | null } | null;
}

export interface HiringMessage extends Who {
  id: string;
  requestId: string;
  text: string;
}

/** HR's review: the job description, criteria, grade, time to fill. */
export interface HiringEdit extends Who {
  id: string;
  requestId: string;
  jobDescription: string;
  mustHave: string[];
  niceToHave: string[];
  grade: number;
  timeToFillDays: number;
}

/**
 * A budget ask: HR asks to change a position's budget ("change"), or
 * the General manager adds a budgeted position ("add"), which is his
 * own sign-off.
 */
export interface BudgetAsk extends Who {
  id: string;
  kind: "change" | "add";
  budgetId: string | null;
  grade: number;
  steps: number;
  reason: string;
  /** For an added position. */
  jobKey: string;
  departmentId: string;
  startIso: string;
}

export interface BudgetDecision extends Who {
  askId: string;
  verdict: "signed-off" | "declined";
  note: string;
}

export interface HiringSlice {
  hiringNew: NewHireRequest[];
  hiringSteps: HiringStep[];
  hiringMessages: HiringMessage[];
  hiringEdits: HiringEdit[];
  budgetAsks: BudgetAsk[];
  budgetDecisions: Record<string, BudgetDecision>;
  /** "Save draft" on Request a hire: one per person, only theirs. */
  hiringDrafts: Record<string, SavedDraft>;
  nextHiring: number;
}

export interface SavedDraft extends HiringDraft {
  /** The demo's date it was saved. */
  on: string;
}

export type HiringAction =
  | { type: "hiring-raise"; draft: HiringDraft; who: Who; n: number }
  | { type: "hiring-raise-undo"; id: string }
  | { type: "hiring-step"; step: Omit<HiringStep, "id"> }
  | { type: "hiring-step-undo"; id: string }
  | { type: "hiring-message"; message: Omit<HiringMessage, "id"> }
  | { type: "hiring-message-undo"; id: string }
  | { type: "hiring-edit"; edit: Omit<HiringEdit, "id"> }
  | { type: "hiring-edit-undo"; id: string }
  | { type: "budget-ask"; ask: Omit<BudgetAsk, "id"> }
  | { type: "budget-ask-undo"; id: string }
  | { type: "budget-decide"; decision: BudgetDecision }
  | { type: "budget-undecide"; askId: string }
  | { type: "hiring-draft-save"; by: string; draft: SavedDraft }
  | { type: "hiring-draft-clear"; by: string };

export const HIRING_INITIAL: HiringSlice = { hiringNew: [],
  hiringSteps: [], hiringMessages: [], hiringEdits: [], budgetAsks: [],
  budgetDecisions: {}, hiringDrafts: {}, nextHiring: 1 };

/** The id the next raise gets (to open it after the dispatch). */
export const nextRequestId = (s: Pick<HiringSlice, "nextHiring">): string =>
  `hreq-new-${s.nextHiring}`;

export const nextAskId = (s: Pick<HiringSlice, "nextHiring">): string =>
  `bask-new-${s.nextHiring}`;

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

/** Steps with their requisition: one action, one undo, both slices. */
export function reduceHiringMoves<S extends HiringSlice & MovesSlice>(
  s: S, a: HiringAction): S {
  if (a.type === "hiring-step" && a.step.req !== null) {
    const r = a.step.req;
    return { ...reduceHiring(s, a), moveSteps: { ...s.moveSteps,
      [r.key]: r.set } };
  }
  if (a.type === "hiring-step-undo") {
    const st = s.hiringSteps.find((x) => x.id === a.id);
    if (st === undefined) return s;
    const next = reduceHiring(s, a);
    if (st.req === null) return next;
    const { [st.req.key]: _gone, ...rest } = s.moveSteps;
    return { ...next, moveSteps: st.req.before === null ? rest
      : { ...rest, [st.req.key]: st.req.before } };
  }
  return reduceHiring(s, a);
}

export function reduceHiring<S extends HiringSlice>(s: S,
  a: HiringAction): S {
  const n = s.nextHiring;
  const has = (xs: readonly { id: string }[], id: string): boolean =>
    xs.some((x) => x.id === id);
  switch (a.type) {
    case "hiring-raise":
      return { ...s, hiringNew: [...s.hiringNew, { ...a.draft, ...a.who,
        id: `hreq-new-${n}`, n: a.n }], hiringDrafts: without(
        s.hiringDrafts, a.who.by), nextHiring: n + 1 };
    case "hiring-raise-undo":
      if (!has(s.hiringNew, a.id)) return s;
      return { ...s, hiringNew: s.hiringNew.filter((x) => x.id !== a.id),
        hiringSteps: s.hiringSteps.filter((x) => x.requestId !== a.id),
        hiringMessages: s.hiringMessages.filter((x) =>
          x.requestId !== a.id) };
    case "hiring-step":
      return { ...s, hiringSteps: [...s.hiringSteps, { ...a.step,
        id: `hstep-${n}` }], nextHiring: n + 1 };
    case "hiring-step-undo":
      if (!has(s.hiringSteps, a.id)) return s;
      return { ...s, hiringSteps: s.hiringSteps.filter((x) =>
        x.id !== a.id) };
    case "hiring-message":
      return { ...s, hiringMessages: [...s.hiringMessages, { ...a.message,
        id: `hmsg-${n}` }], nextHiring: n + 1 };
    case "hiring-message-undo":
      if (!has(s.hiringMessages, a.id)) return s;
      return { ...s, hiringMessages: s.hiringMessages.filter((x) =>
        x.id !== a.id) };
    case "hiring-edit":
      return { ...s, hiringEdits: [...s.hiringEdits, { ...a.edit,
        id: `hedit-${n}` }], nextHiring: n + 1 };
    case "hiring-edit-undo":
      if (!has(s.hiringEdits, a.id)) return s;
      return { ...s, hiringEdits: s.hiringEdits.filter((x) =>
        x.id !== a.id) };
    case "budget-ask": {
      const id = `bask-new-${n}`;
      // The General manager's own ask is his sign-off.
      const own = a.ask.role === "gm";
      return { ...s, budgetAsks: [...s.budgetAsks, { ...a.ask, id }],
        budgetDecisions: own ? { ...s.budgetDecisions, [id]: {
          askId: id, verdict: "signed-off", note: "", by: a.ask.by,
          role: a.ask.role, on: a.ask.on } } : s.budgetDecisions,
        nextHiring: n + 1 };
    }
    case "budget-ask-undo":
      if (!has(s.budgetAsks, a.id)) return s;
      return { ...s, budgetAsks: s.budgetAsks.filter((x) => x.id !== a.id),
        budgetDecisions: without(s.budgetDecisions, a.id) };
    case "budget-decide":
      return { ...s, budgetDecisions: { ...s.budgetDecisions,
        [a.decision.askId]: a.decision } };
    case "budget-undecide":
      if (s.budgetDecisions[a.askId] === undefined) return s;
      return { ...s, budgetDecisions: without(s.budgetDecisions, a.askId) };
    case "hiring-draft-save":
      return { ...s, hiringDrafts: { ...s.hiringDrafts, [a.by]: a.draft } };
    case "hiring-draft-clear":
      if (s.hiringDrafts[a.by] === undefined) return s;
      return { ...s, hiringDrafts: without(s.hiringDrafts, a.by) };
  }
}
