import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DemoData } from "./data/types";
import {
  LEAVE_INITIAL,
  reduceLeave,
  type LeaveAction,
  type LeaveSlice,
} from "./leave-state";

/** manager and employee: the team view and the self view. */
export type Role = "hr" | "gm" | "manager" | "employee";
export type Section = "home" | "pay-run" | "people" | "time-off" |
  "reports";

/** How an issue was settled; the label shown names the choice. */
export type Verdict = "approve" | "decline";

export type Resolution = "iban" | "reviewed" | "renewal";

export interface DemoState extends LeaveSlice {
  role: Role;
  hideAmounts: boolean;
  resolved: Record<string, Resolution>;
  /** Approval id to the decision recorded for it. */
  decided: Record<string, Verdict>;
  /** Issue id to open and focus (from the palette). */
  focusIssue: string | null;
  sourcesOpen: boolean;
}

export type Action =
  | { type: "role"; role: Role }
  | { type: "toggle-amounts" }
  | { type: "resolve"; id: string; how: Resolution }
  | { type: "reopen"; id: string }
  | { type: "decide"; id: string; verdict: Verdict }
  | { type: "undecide"; id: string }
  | { type: "focus-issue"; id: string | null }
  | { type: "sources"; open: boolean }
  | LeaveAction;

export const INITIAL: DemoState = {
  role: "hr", hideAmounts: false, resolved: {}, decided: {},
  focusIssue: null, sourcesOpen: false, ...LEAVE_INITIAL,
};

export function reduce(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "role": return { ...s, role: a.role };
    case "toggle-amounts": return { ...s, hideAmounts: !s.hideAmounts };
    case "resolve":
      return { ...s, resolved: { ...s.resolved, [a.id]: a.how } };
    case "reopen": {
      const { [a.id]: _gone, ...rest } = s.resolved;
      return { ...s, resolved: rest };
    }
    case "decide":
      return { ...s, decided: { ...s.decided, [a.id]: a.verdict } };
    case "undecide": {
      const { [a.id]: _gone, ...rest } = s.decided;
      return { ...s, decided: rest };
    }
    case "focus-issue": return { ...s, focusIssue: a.id };
    case "sources": return { ...s, sourcesOpen: a.open };
    case "request-leave":
    case "withdraw-leave":
    case "restore-leave": return reduceLeave(s, a);
  }
}

interface Demo {
  data: DemoData;
  state: DemoState;
  dispatch(a: Action): void;
}

const DemoContext = createContext<Demo | null>(null);

/** Demo state lives in memory only: a reload starts the story again. */
export function DemoProvider(p: { data: DemoData; children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const value = useMemo(() => ({ data: p.data, state, dispatch }),
    [p.data, state]);
  return (
    <DemoContext.Provider value={value}>{p.children}</DemoContext.Provider>
  );
}

export function useDemo(): Demo {
  const v = useContext(DemoContext);
  if (v === null) throw new Error("useDemo outside DemoProvider");
  return v;
}
