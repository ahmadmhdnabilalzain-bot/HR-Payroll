import type { Role } from "./state";

/**
 * Decisions, new requests and replies on the requests screens
 * (profile changes, travel, the help desk, access requests) and the
 * approval splits and resets. One slice in the demo store, like
 * papers-state.ts: every entry names who did it, in which role and on
 * which demo date, and has an undo.
 */
export interface ReqStep {
  /** The new status word key, e.g. "done", "declined", "booked". */
  status: string;
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
  /** A reason or a note the person typed; may be empty. */
  note: string;
}

export type ReqKind = "profile" | "travel" | "ticket" | "access";

export interface ReqMade {
  id: string;
  kind: ReqKind;
  employeeId: string;
  raisedOn: string;
  /** What the form held, by field key. */
  values: Record<string, string>;
  by: string;
  role: Role;
}

export interface ReqReply {
  id: string;
  ticketId: string;
  from: "employee" | "hr";
  byId: string;
  role: Role;
  on: string;
  text: string;
}

export interface ApprStamp {
  by: string;
  role: Role;
  on: string;
  reason: string;
  /** A split names the second checker. */
  secondId: string | null;
}

export interface RequestsSlice {
  /** Record id to the latest step taken on it. */
  reqSteps: Record<string, ReqStep>;
  reqMade: ReqMade[];
  reqReplies: ReqReply[];
  /** Approval id to who sent it back to waiting. */
  apprResets: Record<string, ApprStamp>;
  /** Approval id to who split it between two checkers. */
  apprSplits: Record<string, ApprStamp>;
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextReq: number;
}

export type RequestsAction =
  | { type: "req-step"; id: string; step: ReqStep }
  | { type: "req-undo"; id: string }
  | { type: "req-new"; draft: Omit<ReqMade, "id"> }
  | { type: "req-new-undo"; id: string }
  | { type: "req-reply"; draft: Omit<ReqReply, "id"> }
  | { type: "req-reply-undo"; id: string }
  | { type: "appr-reset"; id: string; stamp: ApprStamp }
  | { type: "appr-reset-undo"; id: string }
  | { type: "appr-split"; id: string; stamp: ApprStamp }
  | { type: "appr-split-undo"; id: string };

export const REQUESTS_INITIAL: RequestsSlice = { reqSteps: {},
  reqMade: [], reqReplies: [], apprResets: {}, apprSplits: {},
  nextReq: 1 };

const PREFIX: Record<ReqKind, string> = { profile: "pc", travel: "tv",
  ticket: "tk", access: "ar" };

function without<T>(r: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = r;
  return rest;
}

export function reduceRequests<S extends RequestsSlice>(s: S,
  a: RequestsAction): S {
  switch (a.type) {
    case "req-step":
      return { ...s, reqSteps: { ...s.reqSteps, [a.id]: a.step } };
    case "req-undo": return { ...s, reqSteps: without(s.reqSteps, a.id) };
    case "req-new":
      return { ...s, reqMade: [{ ...a.draft,
        id: `${PREFIX[a.draft.kind]}-new-${String(s.nextReq)}` },
      ...s.reqMade], nextReq: s.nextReq + 1 };
    case "req-new-undo":
      return { ...s, reqMade: s.reqMade.filter((x) => x.id !== a.id),
        reqSteps: without(s.reqSteps, a.id) };
    case "req-reply":
      return { ...s, reqReplies: [...s.reqReplies, { ...a.draft,
        id: `rp-${String(s.nextReq)}` }], nextReq: s.nextReq + 1 };
    case "req-reply-undo":
      return { ...s, reqReplies: s.reqReplies.filter((x) =>
        x.id !== a.id) };
    case "appr-reset":
      return { ...s, apprResets: { ...s.apprResets, [a.id]: a.stamp } };
    case "appr-reset-undo":
      return { ...s, apprResets: without(s.apprResets, a.id) };
    case "appr-split":
      return { ...s, apprSplits: { ...s.apprSplits, [a.id]: a.stamp } };
    case "appr-split-undo":
      return { ...s, apprSplits: without(s.apprSplits, a.id) };
  }
}
