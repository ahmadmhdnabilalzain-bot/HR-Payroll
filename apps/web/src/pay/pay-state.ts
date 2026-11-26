import type { Fils } from "@payroll/engine";

/**
 * Pay requests and decisions made during the demo (WP6). They live in
 * the one demo store (state.tsx) beside the leave slice. Each request
 * carries its own approval id ("pay-ap-N"), so the checker's decision
 * goes through the shared `decide` / `undecide` actions and `decided`.
 */
export type PayRequestKind = "loan" | "advance" | "revision" |
  "correction" | "settlement";

export interface PayRequest {
  id: string;
  approvalId: string;
  kind: PayRequestKind;
  employeeId: string;
  /** The amount asked for, or the new monthly basic for a revision. */
  amount: Fils;
  /** Instalments, for a loan or an advance. */
  months: number | null;
  /** "November 2026": first deduction, month corrected or pay month. */
  month: string | null;
  /** ISO date a revision takes effect. */
  effective: string | null;
  reason: string;
  requestedOn: string;
  makerId: string;
  checkerId: string;
  withdrawn: boolean;
}

export type PayDraft = Omit<PayRequest, "id" | "approvalId" | "withdrawn">;

export type FineChoice = "bank" | "recover";

export interface FineDecision {
  choice: FineChoice;
  /** Employee id of the person who decided. */
  by: string;
  on: string;
}

/** Other dues HR adds to a final settlement by hand (notice pay, a
 * deduction agreed, a bonus owed): an amount and its reason. */
export interface OtherDues {
  amount: Fils;
  reason: string;
  /** Employee id of the person who added them. */
  by: string;
}

export interface PaySlice {
  payRequests: PayRequest[];
  /** Leaver's employee id to the other dues added to the settlement. */
  otherDues: Record<string, OtherDues>;
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextPay: number;
  fineDecisions: Record<string, FineDecision>;
}

export type PayAction =
  | { type: "pay-request"; draft: PayDraft }
  | { type: "pay-withdraw"; id: string }
  | { type: "pay-restore"; id: string }
  | { type: "fine-decide"; id: string; decision: FineDecision }
  | { type: "fine-undo"; id: string }
  | { type: "dues-set"; employeeId: string; dues: OtherDues }
  /** Undo puts back what was there before (none, or the old dues). */
  | { type: "dues-undo"; employeeId: string; previous: OtherDues | null };

export const PAY_INITIAL: PaySlice = { payRequests: [], nextPay: 1,
  fineDecisions: {}, otherDues: {} };

export function reducePay<S extends PaySlice>(s: S, a: PayAction): S {
  switch (a.type) {
    case "pay-request": {
      const n = s.nextPay;
      const item: PayRequest = { ...a.draft, id: `pay-new-${n}`,
        approvalId: `pay-ap-${n}`, withdrawn: false };
      return { ...s, payRequests: [item, ...s.payRequests], nextPay: n + 1 };
    }
    case "pay-withdraw":
    case "pay-restore":
      return { ...s, payRequests: s.payRequests.map((r) => r.id === a.id
        ? { ...r, withdrawn: a.type === "pay-withdraw" } : r) };
    case "fine-decide":
      return { ...s, fineDecisions: { ...s.fineDecisions,
        [a.id]: a.decision } };
    case "fine-undo": {
      const { [a.id]: _gone, ...rest } = s.fineDecisions;
      return { ...s, fineDecisions: rest };
    }
    case "dues-set":
      return { ...s, otherDues: { ...s.otherDues,
        [a.employeeId]: a.dues } };
    case "dues-undo": {
      const { [a.employeeId]: _gone, ...rest } = s.otherDues;
      return { ...s, otherDues: a.previous === null ? rest
        : { ...rest, [a.employeeId]: a.previous } };
    }
  }
}
