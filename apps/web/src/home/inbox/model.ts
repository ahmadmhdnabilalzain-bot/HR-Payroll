import type {
  HomeNotice,
  HomeNotification,
  HomeTask,
} from "../../demo/data/home-types";
import type { DemoData } from "../../demo/data/types";
import { approvalBlockedBy, runApprovalId } from "../../demo/derive";
import { hrefOf } from "../../demo/route";
import type { DemoState, Section } from "../../demo/state";
import { approvalHref, approvalItems } from "../../demo/approvals";
import { canSee, personFor } from "../../demo/time-off";
import { areasFor, mayOpen, routeOf } from "../../nav/registry";
import { hiringNotes, hiringTasks } from "../../people/hiring/model";
import type { AreaRoute, NavCtx } from "../../nav/types";

/**
 * The inbox (WP10): the data's tasks and notifications with the demo's
 * own actions laid over them, so a decision, a "done" or a "read" made
 * anywhere shows everywhere. Links come from the registry: a task opens
 * a screen only when that screen is reachable for the role.
 */

export type TaskTone = "overdue" | "soon" | "later" | "done";

export interface InboxTask extends HomeTask {
  done: boolean;
  tone: TaskTone;
  /** Marked done in this demo (so it can be undone). */
  doneHere: boolean;
  href: string;
  /** Said when the link opens the nearest page the role may open,
   * not the record itself. */
  via: string | null;
}

export interface InboxNote extends HomeNotification {
  unread: boolean;
  href: string;
  via: string | null;
}

export interface InboxNoticeRow extends HomeNotice {
  href: string;
}

/** Decisions and bank details have their own rows on every Home. */
const OWN_ROWS = new Set(["approval", "issue"]);

const PREFIX: Record<string, Section> = { people: "people",
  pay: "pay-run", time: "time-off", reports: "reports", setup: "setup",
  me: "me" };

const keyOf = (r: AreaRoute): string => [r.section, ...(r.rest ?? [])]
  .join("/");

const hrefOfRoute = (r: AreaRoute): string =>
  hrefOf(r.section, ...(r.rest ?? []));

/** The area's own link when it is reachable for the role, else null. */
export function areaHref(c: NavCtx, id: string): string | null {
  const a = areasFor(c.state.role).find((x) => x.id === id);
  return a === undefined ? null : hrefOfRoute(routeOf(a, c));
}

/**
 * Where a data target ("people/moves/join-001", "approvals/ap-002")
 * opens for this role, or null. The longest reachable area route that
 * starts the target wins; the link is that area's own screen.
 */
export function targetHref(target: string, c: NavCtx): string | null {
  const [head = "", ...rest] = target.split("/");
  const staff = c.state.role === "manager" || c.state.role === "employee";
  if (head === "approvals") {
    const a = approvalItems(c.data, c.state).find((x) => x.id === rest[0]);
    if (a?.kind === "pay-run") return areaHref(c, "pay.approve");
    if (a?.kind === "overtime") return areaHref(c, "time.crew");
    if (a?.kind === "leave") {
      return areaHref(c, "time.requests") ?? areaHref(c, "requests.waiting");
    }
    return null;
  }
  if (head === "pay" && rest[0] === "this-month") {
    return areaHref(c, "pay.run");
  }
  if (head === "people" && rest[0] === "papers") {
    return staff ? areaHref(c, "me.documents")
      : areaHref(c, "people.expiring");
  }
  const section = PREFIX[head];
  if (section === undefined) return null;
  const want = [section, ...rest].join("/");
  const hit = areasFor(c.state.role).map((a) => routeOf(a, c))
    .filter((r) => want === keyOf(r) || want.startsWith(`${keyOf(r)}/`))
    .sort((a, b) => keyOf(b).length - keyOf(a).length)[0];
  return hit === undefined ? null : hrefOfRoute(hit);
}

/** A link to a record, and what it says when it is the nearest page. */
export interface ItemLink {
  href: string;
  via: string | null;
}

const OFFICE = new Set(["hr", "gm"]);

const routeOfHref = (href: string): AreaRoute => {
  const [section = "", ...rest] = href.replace(/^#\//, "").split("/");
  return { section: section as Section, rest };
};

/** The person's page, when the role may see the person. */
const personHref = (c: NavCtx, id: string): string | null =>
  canSee(c.data, c.state, id) ? hrefOf("people", id) : null;

const nameOf = (c: NavCtx, id: string): string =>
  c.data.people.person(id)?.name.en ?? "";

/** The visa or Emirates ID case HR runs for a person, if any. */
const visaCaseOf = (c: NavCtx, employeeId: string): string | null =>
  c.data.papers.visas().find((v) => v.employeeId === employeeId)?.id
    ?? null;

const link = (href: string | null, via: string | null = null)
  : ItemLink | null => href === null ? null : { href, via };

/**
 * The record an item is about, as this role may open it: the expense
 * claim, the settlement statement, the offer, the visa case, the
 * person, the review cycle. Where the role may not open the record,
 * the nearest page it may open, with a line that says so. Null when
 * nothing fits (the caller falls back to the area's own screen).
 */
export function recordLink(x: { target: string;
  source: { kind: string; id: string } }, c: NavCtx): ItemLink | null {
  const r = c.state.role;
  const office = OFFICE.has(r);
  const me = personFor(c.data, r);
  const { kind, id } = x.source;
  if (kind === "approval") {
    const a = approvalItems(c.data, c.state).find((y) => y.id === id);
    if (a === undefined) return null;
    const href = approvalHref(a);
    return mayOpen(r, routeOfHref(href)) ? link(href) : null;
  }
  if (kind === "document") {
    const doc = c.data.documents().find((y) => y.id === id);
    if (doc === undefined) return null;
    const who = doc.employeeId;
    if (office) {
      const vc = visaCaseOf(c, who);
      return link(vc === null ? personHref(c, who)
        : hrefOf("people", "papers", "visas", vc));
    }
    if (who === me) return link(hrefOf("me", "documents"));
    return link(personHref(c, who));
  }
  if (kind === "checklist") {
    const [listId = "", key = ""] = id.split("/");
    const j = c.data.moves.joiners().find((y) => y.id === listId);
    const l = c.data.moves.leavers().find((y) => y.id === listId);
    const who = j?.employeeId ?? l?.employeeId ?? null;
    const name = j?.personName ?? l?.personName ?? "";
    if (office) {
      if (l !== undefined && key.endsWith("settlement")) {
        return link(hrefOf("pay-run", "settlements", l.employeeId));
      }
      const vc = who === null || key !== "residence-id" ? null
        : visaCaseOf(c, who);
      if (vc !== null) return link(hrefOf("people", "papers", "visas", vc));
      return j !== undefined ? link(hrefOf("people", "moves", "joiners",
        j.id)) : l !== undefined ? link(hrefOf("people", "moves",
        "leavers", l.employeeId)) : null;
    }
    const list = j !== undefined ? "joining" : "leaving";
    const page = who === null ? null : personHref(c, who);
    if (page !== null) {
      return link(page, `The ${list} checklist is HR's: this opens ` +
        `${name}'s profile.`);
    }
    if (r === "it") {
      return link(hrefOf("setup", "access", "users"), `${name} has no ` +
        "user account yet: this opens Users and roles.");
    }
    return null;
  }
  if (kind === "offer") {
    return office ? link(hrefOf("people", "moves", "offers", id)) : null;
  }
  if (kind === "move") {
    const m = c.data.moves.moves().find((y) => y.id === id.split("/")[0]);
    const page = m?.employeeId == null ? null
      : personHref(c, m.employeeId);
    if (office) {
      return link(page ?? hrefOf("people", "moves", "transfers"));
    }
    return page === null ? null : link(page, "Transfers are HR's: this " +
      `opens ${m!.personName}'s profile.`);
  }
  if (kind === "appraisal") {
    const own = x.target.startsWith("me/");
    const hit = /^apr-(.+)-(emp-\d+)$/.exec(id);
    const cycle = hit?.[1] ?? id;
    const who = hit?.[2] ?? null;
    if (office && !own) {
      return link(hrefOf("people", "growth", "appraisals", cycle));
    }
    if (r === "manager" && !own) return link(hrefOf("me", "team-reviews"));
    if (r === "employee" || (r === "manager" && own)) {
      return link(hrefOf("me", "kpis"), "The self-assessment is with " +
        "your manager: this opens your goals for the year.");
    }
    const page = personHref(c, own || who === null ? me : who);
    return page === null ? null : link(page, "Appraisals are run by HR: " +
      `this opens ${own || who === null ? "your" : `${nameOf(c, who)}'s`}` +
      " profile.");
  }
  if (kind === "timesheet") {
    return mayOpen(r, { section: "me", rest: ["timecard"] })
      && r !== "it" ? link(hrefOf("me", "timecard")) : null;
  }
  if (kind === "interview" && office) {
    return link(hrefOf("people", "moves", "board"));
  }
  return null;
}

/** The item's record, else its area's screen, else the fallback. */
export function itemLink(x: { target: string;
  source: { kind: string; id: string } }, c: NavCtx, fallback: string)
  : ItemLink {
  return recordLink(x, c) ?? { href: x.target.startsWith("#/") ? x.target
    : targetHref(x.target, c) ?? fallback, via: null };
}

const TONE: Record<HomeTask["urgency"], TaskTone> = { overdue: "overdue",
  soon: "soon", later: "later", none: "later" };

/** The role's to-do list: open first (as the data orders them). */
export function inboxTasks(d: DemoData, s: DemoState): InboxTask[] {
  const c = { data: d, state: s };
  const rows = d.home.tasks(s.role).filter((t) =>
    !OWN_ROWS.has(t.source.kind)).map((t): InboxTask => {
    const doneHere = t.status === "open" && s.tasksDone.includes(t.id);
    const done = t.status === "done" || doneHere;
    return { ...t, done, doneHere, tone: done ? "done" : TONE[t.urgency],
      ...itemLink(t, c, hrefOf("home", "tasks")) };
  });
  // Hiring tasks open the request itself and close when it moves on.
  const hiring = hiringTasks(d, s).map((t): InboxTask => {
    const doneHere = s.tasksDone.includes(t.id);
    return { ...t, done: doneHere, doneHere, tone: doneHere ? "done"
      : TONE[t.urgency], via: null };
  });
  // Overdue first, then hiring (a person waits on it), then the rest.
  const open = rows.filter((t) => !t.done);
  const late = open.filter((t) => t.urgency === "overdue");
  return [...late, ...hiring.filter((t) => !t.done),
    ...open.filter((t) => t.urgency !== "overdue"),
    ...rows.filter((t) => t.done), ...hiring.filter((t) => t.done)];
}

/**
 * The role's notifications, newest first. While the pay run is held
 * back by bank details it has not gone to the GM ("not sent yet"), so
 * notes that say otherwise wait; a decision made here reads them.
 */
export function inboxNotes(d: DemoData, s: DemoState): InboxNote[] {
  const c = { data: d, state: s };
  const run = runApprovalId(d);
  const held = approvalBlockedBy(d, s).length > 0;
  const hiring = hiringNotes(d, s).map((n): InboxNote => ({ ...n,
    via: null, unread: !s.notesRead.includes(n.id) }));
  const data = d.home.notifications(s.role).filter((n) => !(held &&
    n.source.kind === "approval" && n.source.id === run)).map((n) => ({
    ...n, ...itemLink(n, c, hrefOf("home")),
    unread: !n.read && !s.notesRead.includes(n.id) &&
      !(n.source.kind === "approval" &&
        s.decided[n.source.id] !== undefined) }));
  // Newest first; a sort that keeps the data's own order on a tie.
  return [...data, ...hiring].sort((a, b) =>
    b.createdOn.iso.localeCompare(a.createdOn.iso));
}

export const unreadCount = (d: DemoData, s: DemoState): number =>
  inboxNotes(d, s).filter((n) => n.unread).length;

/**
 * Pinned first, then newest (as the data orders them). Each opens its
 * related record where the role may open it, else its own page.
 */
export function inboxNotices(d: DemoData, s: DemoState): InboxNoticeRow[] {
  const c = { data: d, state: s };
  return d.home.notices(s.role).map((n) => ({ ...n,
    href: noticeHref(n.target, c) ?? hrefOf("home", "notices", n.id) }));
}

/** A notice's related page for the role, or null (its own page). */
function noticeHref(target: string | null, c: NavCtx): string | null {
  const r = c.state.role;
  if (target === null) return null;
  const [head, id = "", more] = target.split("/");
  if (head === "people" && id === "growth") {
    if (OFFICE.has(r)) return hrefOf("people", "growth", "appraisals",
      more ?? "");
    return r === "manager" ? hrefOf("me", "team-reviews")
      : r === "employee" ? hrefOf("me", "kpis") : null;
  }
  if (head === "people") return personHref(c, id);
  if (target === "pay/this-month" && !OFFICE.has(r)) {
    return r === "it" ? null : hrefOf("me", "payslips");
  }
  return targetHref(target, c);
}
