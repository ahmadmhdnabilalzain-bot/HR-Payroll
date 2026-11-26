import type { RequestStatus, Urgency } from "./data/hiring-types";
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
  nextHiring: number;
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
  | { type: "budget-undecide"; askId: string };

export const HIRING_INITIAL: HiringSlice = { hiringNew: [],
  hiringSteps: [], hiringMessages: [], hiringEdits: [], budgetAsks: [],
  budgetDecisions: {}, nextHiring: 1 };

/** The id the next raise gets (to open it after the dispatch). */
export const nextRequestId = (s: Pick<HiringSlice, "nextHiring">): string =>
  `hreq-new-${s.nextHiring}`;

export const nextAskId = (s: Pick<HiringSlice, "nextHiring">): string =>
  `bask-new-${s.nextHiring}`;

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduceHiring<S extends HiringSlice>(s: S,
  a: HiringAction): S {
  const n = s.nextHiring;
  switch (a.type) {
    case "hiring-raise":
      return { ...s, hiringNew: [...s.hiringNew, { ...a.draft, ...a.who,
        id: `hreq-new-${n}`, n: a.n }], nextHiring: n + 1 };
    case "hiring-raise-undo":
      return { ...s, hiringNew: s.hiringNew.filter((x) => x.id !== a.id),
        hiringSteps: s.hiringSteps.filter((x) => x.requestId !== a.id),
        hiringMessages: s.hiringMessages.filter((x) =>
          x.requestId !== a.id) };
    case "hiring-step":
      return { ...s, hiringSteps: [...s.hiringSteps, { ...a.step,
        id: `hstep-${n}` }], nextHiring: n + 1 };
    case "hiring-step-undo":
      return { ...s, hiringSteps: s.hiringSteps.filter((x) =>
        x.id !== a.id) };
    case "hiring-message":
      return { ...s, hiringMessages: [...s.hiringMessages, { ...a.message,
        id: `hmsg-${n}` }], nextHiring: n + 1 };
    case "hiring-message-undo":
      return { ...s, hiringMessages: s.hiringMessages.filter((x) =>
        x.id !== a.id) };
    case "hiring-edit":
      return { ...s, hiringEdits: [...s.hiringEdits, { ...a.edit,
        id: `hedit-${n}` }], nextHiring: n + 1 };
    case "hiring-edit-undo":
      return { ...s, hiringEdits: s.hiringEdits.filter((x) =>
        x.id !== a.id) };
    case "budget-ask": {
      const id = `bask-new-${n}`;
      const own = a.ask.kind === "add" && a.ask.role === "gm";
      return { ...s, budgetAsks: [...s.budgetAsks, { ...a.ask, id }],
        budgetDecisions: own ? { ...s.budgetDecisions, [id]: {
          askId: id, verdict: "signed-off", note: "", by: a.ask.by,
          role: a.ask.role, on: a.ask.on } } : s.budgetDecisions,
        nextHiring: n + 1 };
    }
    case "budget-ask-undo":
      return { ...s, budgetAsks: s.budgetAsks.filter((x) => x.id !== a.id),
        budgetDecisions: without(s.budgetDecisions, a.id) };
    case "budget-decide":
      return { ...s, budgetDecisions: { ...s.budgetDecisions,
        [a.decision.askId]: a.decision } };
    case "budget-undecide":
      return { ...s, budgetDecisions: without(s.budgetDecisions, a.askId) };
  }
}
