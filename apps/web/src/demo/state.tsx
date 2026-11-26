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

/** How an issue was settled; the label shown names the choice. */
export type Resolution = "iban" | "reviewed" | "renewal";

export interface DemoState {
  role: Role;
  hideAmounts: boolean;
  resolved: Record<string, Resolution>;
  /** Approval ids that have a recorded decision, in order. */
  decided: string[];
  /** Issue id to open and focus (from the palette). */
  focusIssue: string | null;
  sourcesOpen: boolean;
}

export type Action =
  | { type: "role"; role: Role }
  | { type: "toggle-amounts" }
  | { type: "resolve"; id: string; how: Resolution }
  | { type: "reopen"; id: string }
  | { type: "decide"; id: string }
  | { type: "undecide"; id: string }
  | { type: "focus-issue"; id: string | null }
  | { type: "sources"; open: boolean };

export const INITIAL: DemoState = {
  role: "hr", hideAmounts: false, resolved: {}, decided: [],
  focusIssue: null, sourcesOpen: false,
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
    case "decide": return s.decided.includes(a.id) ? s
      : { ...s, decided: [...s.decided, a.id] };
    case "undecide":
      return { ...s, decided: s.decided.filter((x) => x !== a.id) };
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
