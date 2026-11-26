import type { Fils } from "@payroll/engine";
import type { Role } from "./state";

/**
 * The pay-structure sandbox (R41): one draft being tried, and the
 * draft plans saved from it. One slice in the demo store, append-only
 * like papers-state.ts: each step names who, their role and the
 * demo's date, and has an undo. A plan is a note of a what-if for the
 * next run; it never moves a figure of the October run.
 */
export type SandboxKind = "housing-raise" | "new-allowance" |
  "overtime-rates";

/** The draft being tried (the same shape the data package takes). */
export interface SandboxDraftSpec {
  kind: SandboxKind;
  grade: number | null;
  percentBps: number;
  monthly: Fils;
  dayBps: number;
  nightBps: number;
}

export interface SandboxPlan {
  id: string;
  title: string;
  draft: SandboxDraftSpec;
  /** People it moves, and the totals as they stood when saved. */
  people: number;
  net: Fils;
  gross: Fils;
  employerCost: Fils;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
}

export interface SandboxSlice {
  /** The draft on screen (null: none picked). */
  sandboxDraft: SandboxDraftSpec | null;
  /** Saved draft plans, newest first. */
  sandboxPlans: SandboxPlan[];
  nextSandbox: number;
}

export type SandboxAction =
  | { type: "sandbox-pick"; draft: SandboxDraftSpec }
  | { type: "sandbox-discard"; draft: SandboxDraftSpec }
  | { type: "sandbox-restore"; draft: SandboxDraftSpec }
  | { type: "sandbox-save"; plan: Omit<SandboxPlan, "id"> }
  | { type: "sandbox-unsave"; id: string };

export const SANDBOX_INITIAL: SandboxSlice = { sandboxDraft: null,
  sandboxPlans: [], nextSandbox: 1 };

export function reduceSandbox<S extends SandboxSlice>(s: S,
  a: SandboxAction): S {
  switch (a.type) {
    case "sandbox-pick": return { ...s, sandboxDraft: a.draft };
    case "sandbox-discard": return { ...s, sandboxDraft: null };
    case "sandbox-restore": return { ...s, sandboxDraft: a.draft };
    case "sandbox-save":
      return { ...s, sandboxPlans: [{ ...a.plan,
        id: `sandbox-plan-${s.nextSandbox}` }, ...s.sandboxPlans],
      nextSandbox: s.nextSandbox + 1 };
    case "sandbox-unsave":
      return { ...s, sandboxPlans: s.sandboxPlans.filter((p) =>
        p.id !== a.id) };
  }
}
