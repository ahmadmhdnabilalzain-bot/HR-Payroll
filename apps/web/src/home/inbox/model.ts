import type {
  HomeNotice,
  HomeNotification,
  HomeTask,
} from "../../demo/data/home-types";
import type { DemoData } from "../../demo/data/types";
import { approvalBlockedBy, runApprovalId } from "../../demo/derive";
import { hrefOf } from "../../demo/route";
import type { DemoState, Section } from "../../demo/state";
import { approvalItems } from "../../demo/approvals";
import { areasFor, routeOf } from "../../nav/registry";
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
  href: string | null;
}

export interface InboxNote extends HomeNotification {
  unread: boolean;
  href: string | null;
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
      href: targetHref(t.target, c) };
  });
  // Hiring tasks open the request itself and close when it moves on.
  const hiring = hiringTasks(d, s).map((t): InboxTask => {
    const doneHere = s.tasksDone.includes(t.id);
    return { ...t, done: doneHere, doneHere, tone: doneHere ? "done"
      : TONE[t.urgency] };
  });
  return [...rows.filter((t) => !t.done), ...hiring.filter((t) => !t.done),
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
    unread: !s.notesRead.includes(n.id) }));
  const data = d.home.notifications(s.role).filter((n) => !(held &&
    n.source.kind === "approval" && n.source.id === run)).map((n) => ({
    ...n, href: targetHref(n.target, c),
    unread: !n.read && !s.notesRead.includes(n.id) &&
      !(n.source.kind === "approval" &&
        s.decided[n.source.id] !== undefined) }));
  // Newest first; a sort that keeps the data's own order on a tie.
  return [...data, ...hiring].sort((a, b) =>
    b.createdOn.iso.localeCompare(a.createdOn.iso));
}

export const unreadCount = (d: DemoData, s: DemoState): number =>
  inboxNotes(d, s).filter((n) => n.unread).length;

/** Pinned first, then newest (as the data orders them). */
export const inboxNotices = (d: DemoData, s: DemoState): HomeNotice[] =>
  d.home.notices(s.role);
