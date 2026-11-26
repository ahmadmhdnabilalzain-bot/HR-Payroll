import type { LeaveTypeId } from "./data/people-types";

/**
 * Time off requests made during the demo. They live in the one demo
 * store (state.tsx) next to the decisions; each new request carries
 * its own approval id, so Home's inbox and the Time off screen read
 * the same decision from `decided`.
 */
export interface NewLeave {
  id: string;
  approvalId: string;
  employeeId: string;
  leaveTypeId: LeaveTypeId;
  startDate: string;
  endDate: string;
  halves: number;
  reasonKey: string;
  /** The person's own words, if any (optional). */
  note: string;
  requestedOn: string;
  checkerId: string;
  withdrawn: boolean;
}

export type LeaveDraft = Omit<NewLeave, "id" | "approvalId" |
  "withdrawn">;

export interface LeaveSlice {
  requests: NewLeave[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextRequest: number;
}

export type LeaveAction =
  | { type: "request-leave"; draft: LeaveDraft }
  | { type: "withdraw-leave"; id: string }
  | { type: "restore-leave"; id: string };

export const LEAVE_INITIAL: LeaveSlice = { requests: [], nextRequest: 1 };

export function reduceLeave<S extends LeaveSlice>(s: S, a: LeaveAction)
  : S {
  switch (a.type) {
    case "request-leave": {
      const n = s.nextRequest;
      const item: NewLeave = { ...a.draft, id: `lr-new-${n}`,
        approvalId: `ap-new-${n}`, withdrawn: false };
      return { ...s, requests: [item, ...s.requests], nextRequest: n + 1 };
    }
    case "withdraw-leave":
    case "restore-leave":
      return { ...s, requests: s.requests.map((r) => r.id === a.id
        ? { ...r, withdrawn: a.type === "withdraw-leave" } : r) };
  }
}
