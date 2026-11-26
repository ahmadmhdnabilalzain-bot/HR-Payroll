import type { Fils } from "@payroll/engine";
import type { DemoData } from "../demo/data/types";
import type { DemoState, Role } from "../demo/state";
import { parseAmountInput } from "../i18n/amount-input";
import type { PayRequest, PayRequestKind } from "./pay-state";
import type { PayView } from "./types";

/** A request's state, as the screens word it (never "approved"). */
export type RequestState = "waiting" | "agreed" | "declined" | "withdrawn";

export function requestState(s: DemoState, r: PayRequest): RequestState {
  if (r.withdrawn) return "withdrawn";
  const v = s.decided[r.approvalId];
  return v === undefined ? "waiting" : v === "approve" ? "agreed"
    : "declined";
}

/** The demo's requests of some kinds, newest first. */
export function requestsOf(s: DemoState,
  kinds: readonly PayRequestKind[]): PayRequest[] {
  return s.payRequests.filter((r) => kinds.includes(r.kind));
}

export function waitingOf(s: DemoState,
  kinds: readonly PayRequestKind[]): number {
  return requestsOf(s, kinds).filter((r) =>
    requestState(s, r) === "waiting").length;
}

/** HR and the GM see pay records; everyone else is outside the view. */
export const canSeePayRecords = (role: Role): boolean =>
  role === "hr" || role === "gm";

/** Fines still to decide. */
export function finesToDecide(v: PayView, s: DemoState): number {
  return v.fines.filter((f) => s.fineDecisions[f.id] === undefined).length;
}

/** The final settlements not yet sent for a decision. */
export function settlementsToSend(v: PayView, s: DemoState): number {
  return v.settlements.filter((x) => !requestsOf(s, ["settlement"])
    .some((r) => r.employeeId === x.employeeId &&
      requestState(s, r) !== "withdrawn")).length;
}

/** "Khalid Al Nuaimi, General manager". */
export function whoIs(d: DemoData, id: string): string {
  const e = d.employee(id);
  return `${e.name.en}, ${e.role.en}`;
}

/** An amount typed in AED, in fils; null when it is not one. */
export function filsOfInput(text: string): Fils | null {
  try {
    return parseAmountInput(text);
  } catch {
    return null;
  }
}
