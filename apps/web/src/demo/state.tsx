import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useRef,
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
  MOVES_INITIAL,
  reduceMoves,
  type MovesAction,
  type MovesSlice,
} from "./moves-state";
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
  AUDITOR_INITIAL,
  reduceAuditor,
  type AuditorAction,
  type AuditorSlice,
} from "../setup/auditor/state";
import {
  PAPERS_INITIAL,
  reducePapers,
  type PapersAction,
  type PapersSlice,
} from "./papers-state";
import {
  EID_INITIAL,
  reduceEid,
  type EidAction,
  type EidSlice,
} from "./eid-state";
import {
  REFERRAL_INITIAL,
  reduceReferral,
  type ReferralAction,
  type ReferralSlice,
} from "./referral-state";
import {
  reduceSandbox,
  SANDBOX_INITIAL,
  type SandboxAction,
  type SandboxSlice,
} from "./sandbox-state";
import {
  PLANNING_INITIAL,
  reducePlanning,
  type PlanningAction,
  type PlanningSlice,
} from "./planning-state";
import {
  CHECKS_INITIAL,
  reduceChecks,
  type ChecksAction,
  type ChecksSlice,
} from "./checks-state";
import {
  HIRING_INITIAL,
  reduceHiringMoves,
  type HiringAction,
  type HiringSlice,
} from "./hiring-state";
import {
  reduceSafety,
  SAFETY_INITIAL,
  type SafetyAction,
  type SafetySlice,
} from "./safety-state";
import {
  REQUESTS_INITIAL,
  reduceRequests,
  type RequestsAction,
  type RequestsSlice,
} from "./requests-state";
import {
  FILES_INITIAL,
  reduceFiles,
  type FilesOp,
  type FilesSlice,
} from "./files-state";
import {
  CONNECT_INITIAL,
  reduceConnect,
  type ConnectAction,
  type ConnectSlice,
} from "../setup/more/state";
import {
  PRIVACY_INITIAL,
  reducePrivacy,
  type PrivacyAction,
  type PrivacySlice,
} from "../setup/privacy/state";
import {
  PRIOR_INITIAL,
  reducePrior,
  type PriorAction,
  type PriorSlice,
} from "../pay/more/state";
import {
  FINISH_INITIAL,
  reduceFinish,
  type FinishAction,
  type FinishSlice,
} from "./finish-state";
import {
  MORE_INITIAL,
  reduceMore,
  type MoreAction,
  type MoreSlice,
} from "./more-state";
import {
  reduceVerify,
  VERIFY_INITIAL,
  type VerifyAction,
  type VerifySlice,
} from "./verify-state";
import {
  PAY_INITIAL,
  reducePay,
  type PayAction,
  type PaySlice,
} from "../pay/pay-state";
import {
  AUDIT_INITIAL,
  reduceAudit,
  type AuditAction,
  type AuditSlice,
} from "./audit-state";
import { auditFor } from "./audit-actions";
import {
  HOLD_INITIAL,
  reduceHolds,
  type HoldAction,
  type HoldSlice,
} from "../pay/gate/hold-state";
import {
  RULE_CHANGE_INITIAL,
  reduceRuleChange,
  type RuleChangeAction,
  type RuleChangeSlice,
} from "../setup/rule-change/state";
import {
  BONUS_INITIAL,
  reduceBonus,
  type BonusAction,
  type BonusSlice,
} from "./bonus-state";
import {
  COMMISSION_INITIAL,
  reduceCommission,
  type CommissionAction,
  type CommissionSlice,
} from "./commission-state";
import {
  POLICIES_INITIAL,
  reducePolicies,
  type PoliciesAction,
  type PoliciesSlice,
} from "./policies-state";
import {
  ESIGN_INITIAL,
  reduceEsign,
  type EsignAction,
  type EsignSlice,
} from "./esign-state";

/** manager and employee: the team view and the self view; it: the IT
 * manager (access, connections, the audit chain; no company pay). */
export type Role = "hr" | "gm" | "manager" | "employee" | "it";
/** "s": a section's own page of areas (`#/s/people`, the phone tab);
 * "me": the employee's own pages (payslips, documents, leave...). */
export type Section = "home" | "pay-run" | "people" | "time-off" |
  "reports" | "setup" | "s" | "me";

export type Verdict = "approve" | "decline";

/** How a non-IBAN issue was settled; IBANs settle through the check. */
export type Resolution = "reviewed" | "renewal";

/** Time off requests made in the demo: LeaveSlice (leave-state.ts). */
export interface DemoState
  extends LeaveSlice, RulesSlice, AccessSlice, TimeSlice, PapersSlice,
    TeamSlice, MovesSlice, PaySlice, SafetySlice, RequestsSlice,
    EidSlice, FilesSlice, ConnectSlice, PriorSlice, HoldSlice, MoreSlice,
    AuditSlice, PrivacySlice, VerifySlice, RuleChangeSlice, PlanningSlice,
    SandboxSlice, ReferralSlice, AuditorSlice, FinishSlice, EsignSlice,
    BonusSlice, CommissionSlice, ChecksSlice, HiringSlice,
    PoliciesSlice {
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
  /** Home tasks marked done in the demo (task ids). */
  tasksDone: string[];
  /** Notifications marked read in the demo (notification ids). */
  notesRead: string[];
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
  | TeamAction
  | MovesAction
  | PayAction
  | SafetyAction
  | EidAction
  | RequestsAction
  | { type: "files"; op: FilesOp }
  | ConnectAction
  | PrivacyAction
  | PriorAction
  | HoldAction
  | MoreAction
  | AuditAction
  | VerifyAction
  | RuleChangeAction
  | PlanningAction
  | ChecksAction
  | SandboxAction
  | ReferralAction
  | HiringAction
  | AuditorAction
  | FinishAction
  | EsignAction
  | BonusAction
  | CommissionAction
  | PoliciesAction
  | { type: "task-done"; id: string }
  | { type: "task-undone"; id: string }
  | { type: "notes-read"; ids: string[] }
  | { type: "notes-unread"; ids: string[] };

export const INITIAL: DemoState = {
  role: "hr", hideAmounts: false, ibans: {}, resolved: {}, decided: {},
  focusIssue: null, sourcesOpen: false, ...LEAVE_INITIAL, ...RULES_INITIAL,
  ...ACCESS_INITIAL, ...TIME_INITIAL, ...PAPERS_INITIAL, ...TEAM_INITIAL,
  ...MOVES_INITIAL, ...PAY_INITIAL, ...SAFETY_INITIAL, ...REQUESTS_INITIAL,
  ...FILES_INITIAL, ...EID_INITIAL,
  ...CONNECT_INITIAL, ...PRIOR_INITIAL,
  ...HOLD_INITIAL,
  ...MORE_INITIAL,
  ...AUDIT_INITIAL,
  ...PRIVACY_INITIAL,
  ...VERIFY_INITIAL,
  ...RULE_CHANGE_INITIAL,
  ...PLANNING_INITIAL,
  ...CHECKS_INITIAL,
  ...SANDBOX_INITIAL,
  ...REFERRAL_INITIAL,
  ...HIRING_INITIAL,
  ...AUDITOR_INITIAL,
  ...FINISH_INITIAL,
  ...ESIGN_INITIAL,
  ...BONUS_INITIAL,
  ...COMMISSION_INITIAL,
  ...POLICIES_INITIAL,
  tasksDone: [], notesRead: [],
};

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduce(s: DemoState, a: Action): DemoState {
  switch (a.type) {
    case "role": return { ...s, role: a.role, eidShown: null };
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
    case "move-step":
    case "move-undo":
    case "ending-new":
    case "ending-undo":
    case "staff-move-new":
    case "staff-move-undo": return reduceMoves(s, a);
    case "files": return reduceFiles(s, a.op);
    case "verify-withdraw":
    case "verify-restore":
    case "verify-intake":
    case "verify-unintake": return reduceVerify(s, a);
    case "task-done": return s.tasksDone.includes(a.id) ? s
      : { ...s, tasksDone: [...s.tasksDone, a.id] };
    case "task-undone":
      return { ...s, tasksDone: s.tasksDone.filter((x) => x !== a.id) };
    case "notes-read":
      return { ...s, notesRead: [...new Set([...s.notesRead, ...a.ids])] };
    case "notes-unread": return { ...s,
      notesRead: s.notesRead.filter((x) => !a.ids.includes(x)) };
    case "safety-mark":
    case "safety-unmark": return reduceSafety(s, a);
    case "eid-show":
    case "eid-hide": return reduceEid(s, a);
    case "req-step":
    case "req-undo":
    case "req-new":
    case "req-new-undo":
    case "req-reply":
    case "req-reply-undo":
    case "appr-reset":
    case "appr-reset-undo":
    case "appr-split":
    case "appr-split-undo": return reduceRequests(s, a);
    case "plan-set":
    case "plan-signoff":
    case "plan-unsign": return reducePlanning(s, a);
    case "check-mark":
    case "check-unmark":
    case "view-save":
    case "view-remove": return reduceChecks(s, a);
    case "sandbox-pick":
    case "sandbox-discard":
    case "sandbox-restore":
    case "sandbox-save":
    case "sandbox-unsave": return reduceSandbox(s, a);
    case "ref-mark":
    case "ref-unmark": return reduceReferral(s, a);
    case "hiring-raise":
    case "hiring-raise-undo":
    case "hiring-step":
    case "hiring-step-undo":
    case "hiring-message":
    case "hiring-message-undo":
    case "hiring-edit":
    case "hiring-edit-undo":
    case "budget-ask":
    case "budget-ask-undo":
    case "budget-decide":
    case "budget-undecide":
    case "hiring-draft-save":
    case "hiring-draft-clear": return reduceHiringMoves(s, a);
    case "more-hire":
    case "more-hire-withdraw":
    case "more-hire-restore":
    case "more-claim":
    case "more-claim-withdraw":
    case "more-claim-restore":
    case "more-fix":
    case "more-fix-withdraw":
    case "more-fix-restore":
    case "more-cover":
    case "more-cover-withdraw":
    case "more-cover-restore": return reduceMore(s, a);
    case "auditor-grant":
    case "auditor-ungrant":
    case "auditor-end-date":
    case "auditor-end-date-undo":
    case "auditor-end":
    case "auditor-reinstate":
    case "auditor-view": return reduceAuditor(s, a);
    case "finish-grant":
    case "finish-grant-withdraw":
    case "finish-grant-restore":
    case "finish-incident":
    case "finish-incident-withdraw":
    case "finish-incident-restore": return reduceFinish(s, a);
    case "pay-request":
    case "pay-withdraw":
    case "pay-restore":
    case "fine-decide":
    case "fine-undo":
    case "dues-set":
    case "dues-undo": return reducePay(s, a);
    case "connect-edit":
    case "connect-undo": return reduceConnect(s, a);
    case "privacy-edit":
    case "privacy-undo":
    case "dsr-decide":
    case "dsr-undo":
    case "retention-sign":
    case "retention-unsign": return reducePrivacy(s, a);
    case "prior-add":
    case "prior-check":
    case "prior-uncheck":
    case "prior-undo": return reducePrior(s, a);
    case "salary-hold":
    case "salary-release": return reduceHolds(s, a);
    case "audit-append":
    case "audit-check":
    case "audit-tamper": return reduceAudit(s, a);
    case "rule-change-step":
    case "rule-change-undo": return reduceRuleChange(s, a);
    case "esign": return reduceEsign(s, a);
    case "bonus-new":
    case "bonus-remove":
    case "bonus-send":
    case "bonus-unsend":
    case "bonus-decide":
    case "bonus-undecide": return reduceBonus(s, a);
    case "commission-prepare":
    case "commission-unprepare":
    case "commission-decide":
    case "commission-undecide": return reduceCommission(s, a);
    case "policy-ack":
    case "policy-unack": return reducePolicies(s, a);
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
  const [state, rawDispatch] = useReducer(reduce, INITIAL);
  const data = useMemo(() => p.source.at(state.ibans),
    [p.source, state.ibans]);
  const latest = useRef({ state, data });
  latest.current = { state, data };
  /** Every action that matters also adds one entry to the audit trail
   * (audit-actions.ts), once it changed something. */
  const dispatch = useCallback((a: Action): void => {
    const { state: s, data: d } = latest.current;
    const next = reduce(s, a);
    rawDispatch(a);
    const entry = next === s ? null : auditFor(a, s, d);
    if (entry === null) return;
    const ap: Action = { type: "audit-append", entry };
    rawDispatch(ap);
    latest.current = { state: reduce(next, ap), data: d };
  }, []);
  const value = useMemo(() => ({ source: p.source, data, state,
    dispatch }), [p.source, data, state, dispatch]);
  return (
    <DemoContext.Provider value={value}>{p.children}</DemoContext.Provider>
  );
}

/** The store, or null outside the provider (shared templates). */
export function useOptionalDemo(): Demo | null {
  return useContext(DemoContext);
}

export function useDemo(): Demo {
  const v = useContext(DemoContext);
  if (v === null) throw new Error("useDemo outside DemoProvider");
  return v;
}
