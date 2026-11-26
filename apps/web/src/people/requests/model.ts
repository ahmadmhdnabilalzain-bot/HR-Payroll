import type {
  AccessRequest,
  HelpTicket,
  ProfileChange,
  TravelRequest,
} from "../../demo/data/requests-types";
import type { DemoData } from "../../demo/data/types";
import type { ReqKind, ReqStep } from "../../demo/requests-state";
import type { DemoState, Role } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { daysBetweenIso } from "../papers/model";

/**
 * The requests as the screens read them: the package's records plus
 * everything made, decided or replied to in the store. Nothing is typed
 * here; words are in words.ts.
 */
export { daysBetweenIso };

/** HR and the General manager work the queues; IT works access ones. */
export const canWork = (s: Pick<DemoState, "role">): boolean =>
  s.role === "hr" || s.role === "gm";
export const canWorkAccess = (s: Pick<DemoState, "role">): boolean =>
  canWork(s) || s.role === "it";

const stepOf = (s: DemoState, id: string): ReqStep | null =>
  s.reqSteps[id] ?? null;
const waitOf = (closed: boolean, on: string, asOf: string): number | null =>
  closed ? null : daysBetweenIso(on, asOf);
const madeOf = (s: DemoState, kind: ReqKind) =>
  s.reqMade.filter((x) => x.kind === kind);

// Profile changes ------------------------------------------------------

export type ChangeStatus = "open" | "proof" | "done" | "declined";

export interface ChangeRow extends Omit<ProfileChange, "base" | "raisedOn"
  | "display"> {
  raisedOn: string;
  status: ChangeStatus;
  step: ReqStep | null;
  isNew: boolean;
  note: string;
  waiting: number | null;
}

export const changeIsOpen = (r: ChangeRow): boolean =>
  r.status === "open" || r.status === "proof";

export function changeRows(d: DemoData, s: DemoState): ChangeRow[] {
  const asOf = d.requests.asOf;
  const row = (r: Omit<ChangeRow, "status" | "step" | "waiting">,
    base: ChangeStatus): ChangeRow => {
    const step = stepOf(s, r.id);
    const status = (step?.status ?? base) as ChangeStatus;
    return { ...r, status, step, waiting: waitOf(status === "done" ||
      status === "declined", r.raisedOn, asOf) };
  };
  const made = madeOf(s, "profile").map((m) => {
    const f = d.requests.changeFields.find((x) =>
      x.id === m.values["field"]);
    return row({ id: m.id, employeeId: m.employeeId,
      fieldId: m.values["field"] ?? "", field: f?.label ?? "Other",
      current: "As on file", proposed: m.values["proposed"] ?? "",
      proof: f?.proof ?? "", raisedOn: m.raisedOn,
      assignedTo: d.requests.ownerId, isNew: true,
      note: m.values["note"] ?? "" }, "open");
  });
  const given = d.requests.profileChanges().map((r) => {
    const { base, raisedOn, display: _display, ...rest } = r;
    return row({ ...rest, raisedOn: raisedOn.iso, isNew: false,
      note: "" }, base);
  });
  return [...made, ...given];
}

// Travel ---------------------------------------------------------------

export type TravelStatus = "open" | "booked" | "done" | "declined";

export interface TravelRow extends Omit<TravelRequest, "base" | "raisedOn" |
  "departOn" | "returnOn" | "display"> {
  raisedOn: string;
  departOn: string;
  returnOn: string;
  status: TravelStatus;
  step: ReqStep | null;
  isNew: boolean;
  note: string;
  waiting: number | null;
}

export const travelIsOpen = (r: TravelRow): boolean => r.status === "open";

export function travelRows(d: DemoData, s: DemoState): TravelRow[] {
  const asOf = d.requests.asOf;
  const row = (r: Omit<TravelRow, "status" | "step" | "waiting">,
    base: TravelStatus): TravelRow => {
    const step = stepOf(s, r.id);
    const status = (step?.status ?? base) as TravelStatus;
    return { ...r, status, step, waiting: waitOf(status !== "open",
      r.raisedOn, asOf) };
  };
  const ent = d.requests.entitlements();
  const made = madeOf(s, "travel").map((m) => {
    const e = ent.find((x) => x.employeeId === m.employeeId);
    return row({ id: m.id, employeeId: m.employeeId,
      title: "Annual home-leave ticket", homeCountry: e?.homeCountry ?? "",
      cabin: e?.cabin ?? "Economy", departOn: m.values["depart"] ?? "",
      returnOn: m.values["return"] ?? "", raisedOn: m.raisedOn,
      assignedTo: d.requests.ownerId, isNew: true,
      note: m.values["note"] ?? "" }, "open");
  });
  const given = d.requests.travelRequests().map((r) => {
    const { base, raisedOn, departOn, returnOn, display: _display,
      ...rest } = r;
    return row({ ...rest, raisedOn: raisedOn.iso, departOn: departOn.iso,
      returnOn: returnOn.iso, isNew: false, note: "" }, base);
  });
  return [...made, ...given];
}

// Help desk ------------------------------------------------------------

export type TicketStatus = "open" | "waiting" | "solved";

export interface MessageRow {
  id: string;
  from: "employee" | "hr";
  byId: string;
  /** Who it was written as, for the line under the text. */
  role: Role | null;
  on: string;
  text: string;
}

export interface TicketRow extends Omit<HelpTicket, "base" | "raisedOn" |
  "thread" | "display"> {
  raisedOn: string;
  status: TicketStatus;
  thread: MessageRow[];
  step: ReqStep | null;
  isNew: boolean;
  /** Days since the last message; null once solved. */
  waiting: number | null;
}

export const ticketNeedsHr = (t: TicketRow): boolean => t.status === "open";

export function ticketRows(d: DemoData, s: DemoState): TicketRow[] {
  const asOf = d.requests.asOf;
  const row = (t: Omit<HelpTicket, "base" | "raisedOn" | "thread" |
    "display"> & { raisedOn: string; thread: MessageRow[]; isNew: boolean },
  base: TicketStatus): TicketRow => {
    const step = stepOf(s, t.id);
    const replies = s.reqReplies.filter((r) => r.ticketId === t.id)
      .map((r): MessageRow => ({ id: r.id, from: r.from, byId: r.byId,
        role: r.role, on: r.on, text: r.text }));
    const thread = [...t.thread, ...replies];
    const last = thread[thread.length - 1];
    const closed = step === null ? base === "solved"
      : step.status === "solved";
    const status: TicketStatus = closed ? "solved"
      : last?.from === "hr" ? "waiting" : "open";
    return { ...t, thread, status, step, waiting: waitOf(closed,
      last?.on ?? t.raisedOn, asOf) };
  };
  const made = madeOf(s, "ticket").map((m) => row({ id: m.id,
    subject: m.values["subject"] ?? "", category: m.values["category"]
      ?? "Other", priority: "Normal", employeeId: m.employeeId,
    raisedOn: m.raisedOn, assignedTo: d.requests.ownerId, isNew: true,
    thread: [{ id: `${m.id}-0`, from: "employee", byId: m.employeeId,
      role: m.role, on: m.raisedOn, text: m.values["text"] ?? "" }] },
  "open"));
  const given = d.requests.tickets().map((t) => {
    const { base, raisedOn, thread, display: _display, ...rest } = t;
    return row({ ...rest, raisedOn: raisedOn.iso, isNew: false,
      thread: thread.map((m, i): MessageRow => ({ id: `${t.id}-${i}`,
        from: m.from, byId: m.byId, role: null, on: m.on.iso,
        text: m.text })) }, base);
  });
  return [...made, ...given];
}

// Access requests ------------------------------------------------------

export type AccessStatus = "open" | "granted" | "declined";

export interface AccessRow extends Omit<AccessRequest, "base" | "raisedOn" |
  "display"> {
  raisedOn: string;
  status: AccessStatus;
  step: ReqStep | null;
  isNew: boolean;
  waiting: number | null;
}

export const accessIsOpen = (r: AccessRow): boolean => r.status === "open";

export function accessRows(d: DemoData, s: DemoState): AccessRow[] {
  const asOf = d.requests.asOf;
  const row = (r: Omit<AccessRow, "status" | "step" | "waiting">,
    base: AccessStatus): AccessRow => {
    const step = stepOf(s, r.id);
    const status = (step?.status ?? base) as AccessStatus;
    return { ...r, status, step, waiting: waitOf(status !== "open",
      r.raisedOn, asOf) };
  };
  const made = madeOf(s, "access").map((m) => {
    const role = d.requests.requestableRoles.find((x) =>
      x.id === m.values["role"]);
    return row({ id: m.id, employeeId: m.employeeId,
      roleId: m.values["role"] ?? "", roleLabel: role?.label ?? "",
      reason: m.values["reason"] ?? "", raisedOn: m.raisedOn,
      isNew: true }, "open");
  });
  const given = d.requests.accessRequests().map((r) => {
    const { base, raisedOn, display: _display, ...rest } = r;
    return row({ ...rest, raisedOn: raisedOn.iso, isNew: false },
      base === "done" ? "granted" : "open");
  });
  return [...made, ...given];
}

// Who acted ------------------------------------------------------------

/** A step made by the viewer's role, as the store records it. */
export function stepBy(d: DemoData, s: DemoState, status: string,
  note = ""): ReqStep {
  return { status, by: personFor(d, s.role), role: s.role,
    on: d.requests.asOf, note };
}
