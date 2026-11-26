import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DemoData, DemoSource } from "./data/types";
import {
  reduceTime,
  TIME_INITIAL,
  type TimeAction,
  type TimeSlice,
} from "./time-state";
import {
  reduceTeam,
  TEAM_INITIAL,
  type TeamAction,
  type TeamSlice,
} from "./team-state";
import {
  LEAVE_INITIAL,
  reduceLeave,
  type LeaveAction,
  type LeaveSlice,
} from "./leave-state";
import {
  reduceRules,
  RULES_INITIAL,
  type RulesAction,
  type RulesSlice,
} from "../setup/rules/state";
import {
  ACCESS_INITIAL,
  reduceAccess,
  type AccessAction,
  type AccessSlice,
} from "../setup/access/state";
import {
  PAPERS_INITIAL,
  reducePapers,
  type PapersAction,
  type PapersSlice,
} from "./papers-state";

/** manager and employee: the team view and the self view. */
export type Role = "hr" | "gm" | "manager" | "employee";
/** "s": a section's own page of areas (`#/s/people`, the phone tab). */
export type Section = "home" | "pay-run" | "people" | "time-off" |
  "reports" | "setup" | "s";

export type Verdict = "approve" | "decline";

/** How a non-IBAN issue was settled; IBANs settle through the check. */
export type Resolution = "reviewed" | "renewal";

/** Time off requests made in the demo: LeaveSlice (leave-state.ts). */
export interface DemoState
  extends LeaveSlice, RulesSlice, AccessSlice, TimeSlice, PapersSlice,
    TeamSlice {
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
  | { type: "sources"; open: boolean }
  | LeaveAction
  | RulesAction
  | AccessAction
  | TimeAction
  | PapersAction
  | TeamAction;

export const INITIAL: DemoState = {
  role: "hr", hideAmounts: false, ibans: {}, resolved: {}, decided: {},
  focusIssue: null, sourcesOpen: false, ...LEAVE_INITIAL, ...RULES_INITIAL,
  ...ACCESS_INITIAL, ...TIME_INITIAL, ...PAPERS_INITIAL,
  ...TEAM_INITIAL,
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
    case "request-leave":
    case "withdraw-leave":
    case "restore-leave": return reduceLeave(s, a);
    case "rule-edit":
    case "rule-undo": return reduceRules(s, a);
    case "access-keep":
    case "access-unkeep":
    case "access-signoff":
    case "access-unsign":
    case "key-revoke":
    case "key-restore":
    case "hook-resend":
    case "hook-unresend": return reduceAccess(s, a);
    case "time-decide":
    case "time-undo":
    case "punch-match":
    case "punch-unmatch": return reduceTime(s, a);
    case "paper-step":
    case "paper-undo":
    case "request-new":
    case "letter-new": return reducePapers(s, a);
    case "team-probation-send":
    case "team-probation-withdraw":
    case "team-probation-decide":
    case "team-probation-undo":
    case "team-remind":
    case "team-unremind": return reduceTeam(s, a);
  }
}

/**
 * The demo store. `data` is the company as the state makes it (IBANs
 * entered re-run the salary file check); `source` answers "would this
 * IBAN pass?"; `state` holds every choice made; `dispatch` changes it.
 */
export interface Demo {
  source: DemoSource;
  data: DemoData;
  state: DemoState;
  dispatch(a: Action): void;
}

const DemoContext = createContext<Demo | null>(null);

/** Demo state lives in memory only: a reload starts the story again. */
export function DemoProvider(p: { source: DemoSource;
  children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const data = useMemo(() => p.source.at(state.ibans),
    [p.source, state.ibans]);
  const value = useMemo(() => ({ source: p.source, data, state,
    dispatch }), [p.source, data, state]);
  return (
    <DemoContext.Provider value={value}>{p.children}</DemoContext.Provider>
  );
}

export function useDemo(): Demo {
  const v = useContext(DemoContext);
  if (v === null) throw new Error("useDemo outside DemoProvider");
  return v;
}
