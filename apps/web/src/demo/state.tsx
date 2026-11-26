import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DemoData } from "./data/types";

export type Role = "hr" | "gm";
export type Section = "home" | "pay-run" | "people" | "time-off" |
  "reports";

export type Verdict = "approve" | "decline";

/** How a non-IBAN issue was settled; IBANs settle through the check. */
export type Resolution = "reviewed" | "renewal";

export interface DemoState {
  role: Role;
  hideAmounts: boolean;
  /** Employee id to the IBAN a person entered (re-checked live). */
  ibans: Record<string, string>;
  resolved: Record<string, Resolution>;
  /** Approval id to the decision recorded for it. */
  decided: Record<string, Verdict>;
  /** Issue id to open and focus (from the palette or primary action). */
  focusIssue: string | null;
  sourcesOpen: boolean;
}

export type Action =
  | { type: "role"; role: Role }
  | { type: "toggle-amounts" }
  | { type: "iban"; employeeId: string; value: string }
  | { type: "unset-iban"; employeeId: string }
  | { type: "resolve"; id: string; how: Resolution }
  | { type: "reopen"; id: string }
  | { type: "decide"; id: string; verdict: Verdict }
  | { type: "undecide"; id: string }
  | { type: "focus-issue"; id: string | null }
  | { type: "sources"; open: boolean };

export const INITIAL: DemoState = {
  role: "hr", hideAmounts: false, ibans: {}, resolved: {}, decided: {},
  focusIssue: null, sourcesOpen: false,
};

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduce(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "role": return { ...s, role: a.role };
    case "toggle-amounts": return { ...s, hideAmounts: !s.hideAmounts };
    case "iban":
      return { ...s, ibans: { ...s.ibans, [a.employeeId]: a.value } };
    case "unset-iban": return { ...s, ibans: without(s.ibans, a.employeeId) };
    case "resolve":
      return { ...s, resolved: { ...s.resolved, [a.id]: a.how } };
    case "reopen": return { ...s, resolved: without(s.resolved, a.id) };
    case "decide":
      return { ...s, decided: { ...s.decided, [a.id]: a.verdict } };
    case "undecide": return { ...s, decided: without(s.decided, a.id) };
    case "focus-issue": return { ...s, focusIssue: a.id };
    case "sources": return { ...s, sourcesOpen: a.open };
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
