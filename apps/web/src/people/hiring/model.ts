import type { HomeNotification, HomeTask } from "../../demo/data/home-types";
import type {
  HiringRequestView,
  Milestone,
  PositionBudget,
  RequestEvent,
  RequestStatus,
  SpendLine,
} from "../../demo/data/hiring-types";
import type { DemoData } from "../../demo/data/types";
import type {
  BudgetAsk,
  BudgetDecision,
  HiringEdit,
  HiringStep,
} from "../../demo/hiring-state";
import { hrefOf } from "../../demo/route";
import type { DemoState, Role } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { offerNow, reqNow, stageNow } from "../moves/view";

/**
 * Hiring requests and the hiring budget as they stand now: the data's
 * seeded requests and positions with the demo's own steps, messages,
 * edits and budget asks laid over them. Requests tied to a requisition
 * read the same overlay as the Requisitions screen (`req:<id>`), and
 * seats read the candidates' and offers' overlays, so no two screens
 * disagree after a click. Pure, so tests and Home read it too.
 */

type S = DemoState;

export interface RequestNow extends HiringRequestView {
  session: boolean;
  /** Steps taken in the demo, oldest first. */
  steps: HiringStep[];
  /** Seeded events plus the demo's steps and messages, oldest first. */
  events: RequestEvent[];
  edit: HiringEdit | null;
  /** The status a resume goes back to. */
  heldFrom: RequestStatus | null;
}

const ROLE_WORD: Record<Role, string> = { hr: "HR manager",
  gm: "General manager", manager: "", employee: "", it: "" };

const STEP_TEXT: Record<RequestStatus, string> = {
  "with-hr": "Sent to HR", changes: "Asked for changes",
  "with-gm": "Sent for sign-off", open: "Signed off", "on-hold":
    "Put on hold", declined: "Declined", withdrawn: "Withdrew the request",
  filled: "Marked filled" };

const seq = (id: string): number => Number(id.replace(/\D/g, ""));

function titleOf(d: DemoData, id: string, role: Role): string {
  return ROLE_WORD[role] !== "" ? ROLE_WORD[role]
    : d.people.person(id)?.role.en ?? "";
}

/** A step's words: its verb, then the note when there is one. */
export function stepText(step: Pick<HiringStep, "to" | "from" | "note">)
  : string {
  const verb = step.from === "on-hold" && step.to !== "withdrawn"
    ? "Resumed" : step.from === "changes" && step.to === "with-hr"
      ? "Sent again" : STEP_TEXT[step.to];
  return step.note.trim() === "" ? verb : `${verb}: ${step.note.trim()}`;
}

function seedsOf(d: DemoData, s: S): HiringRequestView[] {
  const made = s.hiringNew.map((x): HiringRequestView => {
    const raiser = d.people.person(x.by);
    const boss = d.people.person(x.hiringManagerId);
    return { id: x.id, number: d.hiring.number(x.n), jobKey: x.jobKey,
      title: d.hiring.jobTitle(x.jobKey), departmentId: x.departmentId,
      departmentText: d.hiring.departmentText(x.departmentId),
      locationText: boss?.branch.en ?? "", budgetId: x.budgetId,
      requisitionId: null, reason: x.reason,
      replacesName: x.reason === "replacement" && x.replacesName !== ""
        ? x.replacesName : null, headcount: x.headcount,
      startIso: x.startIso, start: { iso: x.startIso,
        display: d.hiring.dateText(x.startIso) }, urgency: x.urgency,
      timeToFillDays: x.timeToFillDays, grade: x.grade,
      jobDescription: x.jobDescription, mustHave: x.mustHave,
      niceToHave: x.niceToHave, stages: x.stages, raisedById: x.by,
      raisedByName: raiser?.name.en ?? "", raisedOn: { iso: x.on,
        display: d.hiring.dateText(x.on) },
      hiringManagerId: x.hiringManagerId,
      hiringManagerName: boss?.name.en ?? "", status: "with-hr",
      signedOffIso: null, events: [{ id: `${x.id}:e1`, byId: x.by,
        name: raiser?.name.en ?? "", title: titleOf(d, x.by, x.role),
        on: { iso: x.on, display: d.hiring.dateText(x.on) }, to: "with-hr",
        text: "Raised the request" }] };
  });
  return [...d.hiring.requests(), ...made];
}

const LINKED: readonly RequestStatus[] = ["open", "on-hold", "filled"];

/** Every request with the demo's overlays, oldest first. */
export function requestsNow(d: DemoData, s: S): RequestNow[] {
  const reqs = d.moves.requisitions();
  const made = new Set(s.hiringNew.map((x) => x.id));
  return seedsOf(d, s).map((r): RequestNow => {
    const steps = s.hiringSteps.filter((x) => x.requestId === r.id);
    const msgs = s.hiringMessages.filter((x) => x.requestId === r.id);
    const edits = s.hiringEdits.filter((x) => x.requestId === r.id);
    const edit = edits.at(-1) ?? null;
    let status = r.status;
    let signed = r.signedOffIso;
    let heldFrom: RequestStatus | null = null;
    if (status === "on-hold") {
      const back = [...r.events].reverse();
      const i = back.findIndex((e) => e.to === "on-hold");
      heldFrom = back.slice(i + 1).find((e) => e.to !== null)?.to
        ?? "with-hr";
    }
    for (const st of steps) {
      if (st.to === "on-hold") heldFrom = st.from;
      if (st.to === "open" && st.from === "with-gm") signed = st.on;
      status = st.to;
    }
    const req = reqs.find((x) => x.id === r.requisitionId);
    if (req !== undefined && LINKED.includes(status) &&
      s.moveSteps[`req:${req.id}`] !== undefined) {
      const v = reqNow(req, s);
      if (v === "on-hold" && status !== "on-hold") heldFrom = status;
      status = v;
    }
    const mine = [...steps.map((x): RequestEvent => ({ id: x.id,
      byId: x.by, name: d.people.person(x.by)?.name.en ?? "",
      title: titleOf(d, x.by, x.role), on: { iso: x.on,
        display: d.hiring.dateText(x.on) }, to: x.to,
      text: stepText(x) })), ...msgs.map((x): RequestEvent => ({
      id: x.id, byId: x.by, name: d.people.person(x.by)?.name.en ?? "",
      title: titleOf(d, x.by, x.role), on: { iso: x.on,
        display: d.hiring.dateText(x.on) }, to: null, text: x.text })),
    ...edits.map((x): RequestEvent => ({ id: x.id, byId: x.by,
      name: d.people.person(x.by)?.name.en ?? "",
      title: titleOf(d, x.by, x.role), on: { iso: x.on,
        display: d.hiring.dateText(x.on) }, to: null,
      text: "Edited the job description and criteria" }))]
      .sort((a, b) => seq(a.id) - seq(b.id));
    return { ...r, ...(edit === null ? {} : {
      jobDescription: edit.jobDescription, mustHave: edit.mustHave,
      niceToHave: edit.niceToHave, grade: edit.grade,
      timeToFillDays: edit.timeToFillDays }), status,
    signedOffIso: signed, session: made.has(r.id), steps, edit,
    heldFrom, events: [...r.events, ...mine] };
  });
}

/** Who may see a request: HR and the GM all; a manager their own. */
export function canSeeRequest(d: DemoData, s: Pick<S, "role">,
  r: Pick<HiringRequestView, "raisedById" | "hiringManagerId">): boolean {
  if (s.role === "hr" || s.role === "gm") return true;
  if (s.role !== "manager") return false;
  const me = personFor(d, s.role);
  return r.raisedById === me || r.hiringManagerId === me;
}

export const visibleRequests = (d: DemoData, s: S): RequestNow[] =>
  requestsNow(d, s).filter((r) => canSeeRequest(d, s, r));

export const mayRaise = (role: Role): boolean =>
  role === "hr" || role === "gm" || role === "manager";

export type ActId = "send" | "changes" | "signoff" | "decline" | "hold" |
  "resume" | "withdraw" | "resend";

export interface Act {
  id: ActId;
  label: string;
  to: RequestStatus;
  /** A note is asked for ("required" must not be empty). */
  note: "none" | "optional" | "required";
  primary: boolean;
}

const ACT = (id: ActId, label: string, to: RequestStatus,
  note: Act["note"], primary = false): Act =>
  ({ id, label, to, note, primary });

/** What the role may do with the request in its status now. */
export function actsFor(r: RequestNow, role: Role, me: string): Act[] {
  const raiser = r.raisedById === me && mayRaise(role);
  const out: Act[] = [];
  const hr = role === "hr";
  const gm = role === "gm";
  switch (r.status) {
    case "with-hr":
      if (hr) {
        out.push(ACT("send", "Send for sign-off", "with-gm", "optional",
          true), ACT("changes", "Ask for changes", "changes", "required"),
        ACT("hold", "Put on hold", "on-hold", "optional"));
      }
      break;
    case "changes":
      if (raiser) {
        out.push(ACT("resend", "Send again", "with-hr", "optional", true));
      }
      break;
    case "with-gm":
      if (gm) {
        out.push(ACT("signoff", "Sign off", "open", "optional", true),
          ACT("changes", "Ask for changes", "changes", "required"),
          ACT("decline", "Decline", "declined", "required"),
          ACT("hold", "Put on hold", "on-hold", "optional"));
      }
      break;
    case "open":
      if (hr || gm) out.push(ACT("hold", "Put on hold", "on-hold",
        "optional"));
      break;
    case "on-hold":
      if (hr || gm) {
        out.push(ACT("resume", "Resume", r.heldFrom ?? "with-hr", "none",
          true));
      }
      break;
    default: break;
  }
  if (raiser && ["with-hr", "changes", "with-gm"].includes(r.status)) {
    out.push(ACT("withdraw", "Withdraw", "withdrawn", "optional"));
  }
  return out;
}

/** The last step on a request, when the viewer took it (to undo). */
export function undoable(r: RequestNow, me: string): HiringStep | null {
  const last = r.steps.at(-1);
  return last !== undefined && last.by === me ? last : null;
}

// ---------------------------------------------------------------
// The timeline and the candidates of an open position
// ---------------------------------------------------------------

export function candidatesOf(d: DemoData, s: S, r: RequestNow) {
  return d.moves.candidates().filter((c) =>
    c.requisitionId === r.requisitionId).map((c) => ({ ...c,
    now: stageNow(c, s) }));
}

export function timelineOf(d: DemoData, s: S, r: RequestNow): Milestone[] {
  const req = d.moves.requisitions().find((x) => x.id === r.requisitionId);
  const offers = d.moves.offers().filter((o) =>
    o.requisitionId === r.requisitionId).map((o) => offerNow(o, s));
  const progress = d.hiring.progress({
    published: req?.published === true,
    stages: candidatesOf(d, s, r).map((c) => c.now),
    offers: offers.map((o) => o === "waiting" ? "draft" : o),
    filled: r.status === "filled" });
  return d.hiring.timeline({ signedOffIso: ["open", "filled", "on-hold"]
    .includes(r.status) ? r.signedOffIso : null,
  timeToFillDays: r.timeToFillDays, startIso: r.startIso, progress });
}

/** The request behind a requisition (the Board's link to it). */
export const requestOfRequisition = (d: DemoData, s: S, reqId: string)
  : RequestNow | null =>
  requestsNow(d, s).find((r) => r.requisitionId === reqId) ?? null;

export const requestHref = (id: string): string =>
  hrefOf("people", "hiring", "requests", id);

// ---------------------------------------------------------------
// The hiring budget now
// ---------------------------------------------------------------

export interface AskNow extends Omit<BudgetAsk, "kind"> {
  kind: "change" | "add";
  byName: string;
  onText: string;
  decision: BudgetDecision | null;
}

/** Seeded and demo asks, with their decision if any. */
export function asksNow(d: DemoData, s: S): AskNow[] {
  const seeded = d.hiring.budgetAsks().map((a): AskNow => ({ id: a.id,
    kind: "change", budgetId: a.budgetId, grade: a.grade, steps: a.steps,
    reason: a.reason, jobKey: "", departmentId: "", startIso: "",
    by: a.askedById, role: "hr", on: a.askedOn.iso, byName: a.askedByName,
    onText: a.askedOn.display, decision: s.budgetDecisions[a.id] ?? null }));
  return [...seeded, ...s.budgetAsks.map((a): AskNow => ({ ...a,
    byName: d.people.person(a.by)?.name.en ?? "",
    onText: d.hiring.dateText(a.on),
    decision: s.budgetDecisions[a.id] ?? null }))];
}

export interface BudgetRow extends PositionBudget {
  session: boolean;
  /** A change waiting for the General manager. */
  pending: AskNow | null;
  /** Signed-off changes, oldest first. */
  changes: AskNow[];
}

function withCost(d: DemoData, row: PositionBudget, grade: number,
  steps: number): PositionBudget {
  const cost = d.hiring.cost(grade, steps, row.startIso);
  return { ...row, grade, steps, cost,
    gradeText: d.hiring.stepText(grade, steps),
    left: (cost.firstYear - (row.committed?.amount ?? 0n) -
      (row.offered?.amount ?? 0n)) as PositionBudget["left"] };
}

function seatNow(d: DemoData, s: S, row: PositionBudget,
  all: readonly PositionBudget[]): PositionBudget {
  const req = d.moves.requisitions().find((x) => x.id === row.requisitionId);
  if (req === undefined) return row;
  const offer = d.moves.offers().find((o) => o.id === row.offerId);
  const now = offer === undefined ? null : offerNow(offer, s);
  const spend: SpendLine | null = row.committed ?? row.offered;
  const others = new Set(all.filter((x) => x.requisitionId === req.id &&
    x.id !== row.id).map((x) => x.offerId));
  const stages = d.moves.candidates().filter((c) =>
    c.requisitionId === req.id && !others.has(c.offerId))
    .map((c) => stageNow(c, s));
  const taken = req.id === "req-001" || now === "accepted";
  const committed = req.id === "req-001" ? row.committed
    : now === "accepted" && spend !== null ? { ...spend,
      label: "Offer accepted" } : null;
  const offered = now !== null && now !== "accepted" &&
    now !== "declined" && spend !== null ? spend : null;
  const status = d.hiring.statusOf({ requisition: reqNow(req, s), stages,
    taken });
  return { ...row, status, committed, offered,
    left: (row.cost.firstYear - (committed?.amount ?? 0n) -
      (offered?.amount ?? 0n)) as PositionBudget["left"] };
}

function fromRequest(d: DemoData, r: RequestNow, seat: number)
  : BudgetRow {
  const cost = d.hiring.cost(r.grade, 0, r.startIso);
  const gm = d.people.personas().gmId;
  return { id: `bud-${r.id}-${seat}`, positionId: `${r.id}-${seat}`,
    jobKey: r.jobKey, title: r.title, departmentId: r.departmentId,
    departmentText: r.departmentText, locationText: r.locationText,
    grade: r.grade, steps: 0, gradeText: d.hiring.stepText(r.grade, 0),
    ownerId: r.hiringManagerId, ownerName: r.hiringManagerName,
    requisitionId: null, requestId: r.id, offerId: null,
    startIso: r.startIso, start: r.start, cost, committed: null,
    offered: null, left: cost.firstYear,
    status: r.status === "filled" ? "filled" : r.status === "open"
      ? "open" : "budgeted", budgetState: "signed-off",
    signedOff: { id: gm, name: d.people.person(gm)?.name.en ?? "",
      on: { iso: r.signedOffIso ?? d.hiring.asOf,
        display: d.hiring.dateText(r.signedOffIso ?? d.hiring.asOf) } },
    note: `A new position from request ${r.number}.`, session: true,
    pending: null, changes: [] };
}

/** Every budgeted position now, seeded first. */
export function budgetRows(d: DemoData, s: S): BudgetRow[] {
  const asks = asksNow(d, s);
  const reqs = requestsNow(d, s);
  const base = d.hiring.budget();
  const signed = (a: AskNow) => a.decision?.verdict === "signed-off";
  const seeded = base.map((row0): BudgetRow => {
    let row = seatNow(d, s, row0, base);
    const r = reqs.find((x) => x.id === row.requestId);
    if (row.budgetState === "waiting" && r !== undefined &&
      r.signedOffIso !== null && (r.status === "open" ||
        r.status === "filled")) {
      const gm = d.people.personas().gmId;
      row = { ...row, budgetState: "signed-off", signedOff: { id: gm,
        name: d.people.person(gm)?.name.en ?? "", on: { iso: r.signedOffIso,
          display: d.hiring.dateText(r.signedOffIso) } } };
    }
    return { ...row, session: false, changes: [], pending: null };
  });
  const added = asks.filter((a) => a.kind === "add" && signed(a))
    .map((a): BudgetRow => {
      const owner = d.hiring.hiringManagerFor(a.departmentId);
      const cost = d.hiring.cost(a.grade, a.steps, a.startIso);
      const r = reqs.find((x) => x.budgetId === `bud-${a.id}` &&
        !["declined", "withdrawn"].includes(x.status));
      return { id: `bud-${a.id}`, positionId: a.id, jobKey: a.jobKey,
        title: d.hiring.jobTitle(a.jobKey), departmentId: a.departmentId,
        departmentText: d.hiring.departmentText(a.departmentId),
        locationText: d.people.person(owner)?.branch.en ?? "",
        grade: a.grade, steps: a.steps,
        gradeText: d.hiring.stepText(a.grade, a.steps), ownerId: owner,
        ownerName: d.people.person(owner)?.name.en ?? "",
        requisitionId: null, requestId: r?.id ?? null, offerId: null,
        startIso: a.startIso, start: { iso: a.startIso,
          display: d.hiring.dateText(a.startIso) }, cost, committed: null,
        offered: null, left: cost.firstYear,
        status: r?.status === "open" ? "open" : r?.status === "filled"
          ? "filled" : "budgeted", budgetState: "signed-off",
        signedOff: { id: a.decision!.by, name: d.people.person(
          a.decision!.by)?.name.en ?? "", on: { iso: a.decision!.on,
          display: d.hiring.dateText(a.decision!.on) } },
        note: a.reason, session: true, pending: null, changes: [] };
    });
  const fresh = reqs.filter((r) => r.budgetId === null &&
    r.requisitionId === null && r.signedOffIso !== null)
    .flatMap((r) => Array.from({ length: r.headcount }, (_, i) =>
      fromRequest(d, r, i + 1)));
  // Changes apply to every position, seeded or made in the demo.
  return [...seeded, ...added, ...fresh].map((row): BudgetRow => {
    const mine = asks.filter((a) => a.kind === "change" &&
      a.budgetId === row.id);
    const changes = mine.filter(signed);
    const last = changes.at(-1);
    return { ...(last === undefined ? row
      : withCost(d, row, last.grade, last.steps)), session: row.session,
    changes, pending: mine.find((a) => a.decision === null) ?? null };
  });
}

/** Budgeted positions a new request can fill (no live request yet). */
export const freePositions = (rows: readonly BudgetRow[],
  reqs: readonly RequestNow[]): BudgetRow[] =>
  rows.filter((b) => b.status === "budgeted" && b.budgetState ===
    "signed-off" && b.requestId === null && !reqs.some((r) =>
    r.budgetId === b.id && !["declined", "withdrawn"].includes(r.status)));

// ---------------------------------------------------------------
// Home: tasks and notifications for HR, the GM and the manager
// ---------------------------------------------------------------

const task = (me: string, id: string, title: string,
  detail: string, kind: "approval" | "offer", target: string,
  overdue = false): HomeTask & { href: string } => ({ id, assigneeId: me,
  title, detail, dueOn: null, dueText: overdue ? "Behind plan" : "",
  urgency: overdue ? "overdue" : "soon", priority: overdue ? "high"
    : "normal", status: "open", completedOn: null,
  source: { kind: kind === "approval" ? "checklist" : "offer", id },
  subjectEmployeeId: null, target, href: target === "" ? "" : target });

/** The role's hiring tasks: each closes when the request moves on. */
export function hiringTasks(d: DemoData, s: S)
  : (HomeTask & { href: string })[] {
  const me = personFor(d, s.role);
  const out: (HomeTask & { href: string })[] = [];
  for (const r of visibleRequests(d, s)) {
    const href = requestHref(r.id);
    const who = `${r.raisedByName}, ${r.departmentText}`;
    if (s.role === "hr" && r.status === "with-hr") {
      out.push(task(me, `hiring:review:${r.id}`, `Review the hiring ` +
        `request for ${r.title}`, who, "approval", href));
    }
    if (s.role === "gm" && r.status === "with-gm") {
      out.push(task(me, `hiring:signoff:${r.id}`, `Sign off the ` +
        `hiring request for ${r.title}`, who, "approval", href));
    }
    if (r.status === "changes" && r.raisedById === me) {
      const by = [...r.events].reverse().find((e) => e.to === "changes");
      out.push(task(me, `hiring:changes:${r.id}`, `Update your ` +
        `hiring request for ${r.title}`, `${by?.name ?? "HR"} asked for ` +
        "changes", "approval", href));
    }
    if (s.role === "hr" && r.status === "open") {
      const late = timelineOf(d, s, r).find((m) => m.state === "overdue");
      if (late !== undefined) {
        out.push(task(me, `hiring:late:${r.id}`, `${r.title}: ` +
          `${late.label.toLowerCase()} is behind plan`, late.text, "offer",
        href, true));
      }
    }
  }
  if (s.role === "gm") {
    for (const b of budgetRows(d, s)) {
      if (b.pending === null) continue;
      out.push(task(me, `hiring:budget:${b.pending.id}`, `Sign off ` +
        `a budget change for ${b.title}`, `${b.pending.byName}, ` +
        b.departmentText, "approval",
      hrefOf("people", "hiring", "budget", b.id)));
    }
  }
  return out;
}

/** What the role hears about: other people's steps and messages. */
export function hiringNotes(d: DemoData, s: S)
  : (HomeNotification & { href: string })[] {
  const me = personFor(d, s.role);
  const out: (HomeNotification & { href: string })[] = [];
  for (const r of visibleRequests(d, s)) {
    for (const e of r.events) {
      if (e.byId === me) continue;
      const ago = -(d.hiring.daysLeft(e.on.iso, 0) ?? 0);
      if (ago > 10) continue;
      const forGm = e.to === "with-gm" || r.status === "with-gm";
      if (s.role === "gm" && !forGm) continue;
      out.push({ id: `hiring:${e.id}`, assigneeId: me, createdOn: e.on,
        agoText: ago <= 0 ? "Today" : ago === 1 ? "Yesterday"
          : `${ago} days ago`, level: e.to === "with-gm" ||
          e.to === "with-hr" || e.to === "changes" ? "action" : "info",
        title: `${e.name}, ${r.title}`, body: e.to === null
          ? `Wrote: ${e.text}` : e.text, read: false,
        source: { kind: "hiring", id: r.id }, target: requestHref(r.id),
        href: requestHref(r.id) });
    }
  }
  return out.sort((a, b) => b.createdOn.iso.localeCompare(a.createdOn.iso)
    || seq(b.id) - seq(a.id));
}
