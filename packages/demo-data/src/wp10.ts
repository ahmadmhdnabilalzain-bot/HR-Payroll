import { addDays, daysBetween, formatAed } from "@payroll/engine";
import { AS_OF, PAY_CALENDAR } from "./calendar";
import { duration, plural, type DisplayDate } from "./display";
import { issuesOf } from "./issues";
import { DEMO_LABELS_EN, type DemoLabelKey } from "./labels-en";
import type { DayStatus, DemoCompany, DemoEmployee } from "./types";
import { appraisalCycleViews, appraisalViews, directReportsOf } from
  "./wp2";
import {
  dueTextOf,
  jobTitleText,
  managerIdFor,
  movesDataOf,
  placeText,
  shortDateOf,
  shortDateText,
} from "./wp3";

/**
 * WP10: home and the employee bar. FICTIONAL tasks, notifications and
 * notices for five roles. Every item is derived from data the demo
 * already holds (approvals, documents, issues, WP2 and WP3), so a
 * task or notice cannot disagree with the screen it opens.
 */

export type HomeRole = "hr" | "gm" | "it" | "manager" | "employee";
export const HOME_ROLES: readonly HomeRole[] = ["hr", "gm", "it",
  "manager", "employee"];

const ROLE_TEXT: Record<HomeRole, string> = { hr: "HR manager",
  gm: "General manager", it: "IT manager", manager: "Line manager",
  employee: "Employee" };

export interface HomeRolePersona {
  role: HomeRole;
  roleText: string;
  employeeId: string;
  name: string;
  title: string;
}

const find = (es: readonly DemoEmployee[], id: string): DemoEmployee =>
  es.find((e) => e.id === id)!;

/**
 * The people the role switcher stands for: HR prepared the pay run,
 * the GM decides it, the employee is the overtime case and the line
 * manager is that employee's manager (as in the demo's own switcher).
 */
export function homeRolePersonas(c: DemoCompany): HomeRolePersona[] {
  const es = c.employees;
  const run = c.approvals.find((a) => a.kind === "pay-run")!;
  const emp = es.find((e) => e.cases.includes("overtime"))!;
  const ids: Record<HomeRole, string> = { hr: run.makerEmployeeId,
    gm: run.checkerEmployeeId,
    it: es.find((e) => e.jobKey === "it-manager")!.id,
    manager: managerIdFor(es, emp)!, employee: emp.id };
  return HOME_ROLES.map((role) => {
    const e = find(es, ids[role]);
    return { role, roleText: ROLE_TEXT[role], employeeId: e.id,
      name: e.fullName, title: jobTitleText(e.jobKey) };
  });
}

const personaId = (c: DemoCompany, role: HomeRole): string =>
  homeRolePersonas(c).find((p) => p.role === role)!.employeeId;

const label = (key: string): string =>
  DEMO_LABELS_EN[key as DemoLabelKey] ?? key;

export type HomeTaskKind = "approval" | "checklist" | "document" |
  "issue" | "offer" | "interview" | "move" | "appraisal" | "probation";

export interface HomeTask {
  id: string;
  assigneeId: string;
  title: string;
  detail: string;
  dueOn: DisplayDate | null;
  dueText: string;
  urgency: "overdue" | "soon" | "later" | "none";
  priority: "high" | "normal";
  status: "open" | "done";
  completedOn: DisplayDate | null;
  source: { kind: HomeTaskKind; id: string };
  subjectEmployeeId: string | null;
  /** Where the task opens (a route hint for the screens). */
  target: string;
}

interface TaskIn {
  assignee: string;
  kind: HomeTaskKind;
  id: string;
  title: string;
  detail: string;
  due: string | null;
  subject?: string | null;
  target: string;
  done?: string;
}

function mkTask(t: TaskIn): HomeTask {
  const n = t.due === null ? null : daysBetween(AS_OF, t.due);
  const done = t.done !== undefined;
  const open = !done && n !== null;
  return { id: `task-${t.kind}-${t.id}-${t.assignee}`,
    assigneeId: t.assignee, title: t.title, detail: t.detail,
    dueOn: t.due === null ? null : shortDateOf(t.due),
    dueText: done ? `Done ${shortDateText(t.done!)}`
      : t.due === null ? "No due date" : dueTextOf(t.due),
    urgency: !open ? "none" : n < 0 ? "overdue" : n <= 7 ? "soon"
      : "later",
    priority: open && n <= 3 ? "high" : "normal",
    status: done ? "done" : "open",
    completedOn: done ? shortDateOf(t.done!) : null,
    source: { kind: t.kind, id: t.id },
    subjectEmployeeId: t.subject ?? null, target: t.target };
}

const DOC_TEXT: Record<string, string> = { "residence-visa":
  "residence visa", "emirates-id": "Emirates ID", passport: "passport" };

const RECENT_DAYS = 14;

function approvalTasks(c: DemoCompany): HomeTask[] {
  const es = c.employees;
  return c.approvals.flatMap((a) => {
    const who = a.employeeId === null ? null : find(es, a.employeeId);
    const maker = find(es, a.makerEmployeeId);
    const open = (title: string, detail: string, due: string) =>
      mkTask({ assignee: a.checkerEmployeeId, kind: "approval", id: a.id,
        title, detail, due, subject: who?.id ?? null,
        target: `approvals/${a.id}` });
    if (a.kind === "pay-run") {
      return [open("Approve the October pay run", `Prepared by ` +
        `${maker.fullName} on ${shortDateText(a.requestedOn)}. ` +
        `${a.amountNote ?? ""}`.trim(), PAY_CALENDAR.approveBy),
      mkTask({ assignee: maker.id, kind: "approval", id: a.id,
        title: "Send the October pay run to the General Manager",
        detail: "Waiting for the General Manager's decision",
        due: PAY_CALENDAR.approveBy, target: `approvals/${a.id}`,
        done: a.requestedOn })];
    }
    if (a.kind === "leave") {
      const r = c.leaveRequests.find((x) => x.id === a.subjectId)!;
      const type = label(c.leaveTypes.find((t) =>
        t.id === r.leaveTypeId)!.labelKey);
      return [open(`Decide on ${who!.fullName}'s leave request`,
        `${type}, ${shortDateText(r.startDate)} to ` +
        shortDateText(r.endDate), addDays(r.startDate, -7))];
    }
    return [open(`Decide on ${who!.fullName}'s expense claim`,
      `${formatAed(a.amount!)}, claimed on ` +
      shortDateText(a.requestedOn), addDays(a.requestedOn, 7))];
  });
}

function checklistTasks(c: DemoCompany): HomeTask[] {
  const es = c.employees;
  const d = movesDataOf(c);
  const hr = personaId(c, "hr");
  const it = personaId(c, "it");
  const fin = es.find((e) => e.jobKey === "finance-manager")!.id;
  const lists = [...d.joiners.map((l) => ({ l, boss: l.employeeId === null
    ? d.requisitions.find((r) => r.id === d.candidates.find((x) =>
      x.id === l.candidateId)!.requisitionId)!.hiringManagerId
    : managerIdFor(es, find(es, l.employeeId))!, who: l.employeeId })),
  ...d.leavers.map((l) => ({ l, boss: managerIdFor(es, find(es,
    l.employeeId))!, who: l.employeeId as string | null }))];
  const since = addDays(AS_OF, -RECENT_DAYS);
  return lists.flatMap(({ l, boss, who }) => l.items.flatMap((i) => {
    if (i.state === "done" && i.doneOn!.iso < since) return [];
    const owner = { hr, it, finance: fin, manager: boss,
      employee: who ?? hr }[i.ownerRole];
    return [mkTask({ assignee: owner, kind: "checklist",
      id: `${l.id}/${i.key}`, title: `${i.label}: ${l.personName}`,
      detail: i.note ?? `${l.title}, ${l.progressText}`,
      due: i.dueOn.iso, subject: who,
      target: `people/moves/${l.id}`,
      ...(i.doneOn === null ? {} : { done: i.doneOn.iso }) })];
  }));
}

function peopleTasks(c: DemoCompany): HomeTask[] {
  const es = c.employees;
  const hr = personaId(c, "hr");
  const it = personaId(c, "it");
  const d = movesDataOf(c);
  const docs = c.documents.filter((x) => x.daysLeft <= 90).flatMap((x) => {
    const name = find(es, x.employeeId).fullName;
    const kind = DOC_TEXT[x.kind]!;
    const hrTask = mkTask({ assignee: hr, kind: "document", id: x.id,
      title: `Renew the ${kind} of ${name}`, detail: `Expires on ` +
        `${shortDateText(x.expiresOn)}`, due: x.expiresOn,
      subject: x.employeeId, target: `people/papers/${x.id}` });
    return x.daysLeft > 30 ? [hrTask] : [hrTask, mkTask({
      assignee: x.employeeId, kind: "document", id: x.id,
      title: `Send your ${kind} papers to HR`, detail: `Your ${kind} ` +
        `expires on ${shortDateText(x.expiresOn)}`,
      due: addDays(x.expiresOn, -7), subject: x.employeeId,
      target: `me/documents/${x.id}` })];
  });
  const issues = issuesOf(c).flatMap((i, k) => {
    if (i.kind === "issue" && i.fixKind === "enter-iban" &&
      i.employeeId !== null) {
      return [mkTask({ assignee: hr, kind: "issue", id: `${i.code}/${k}`,
        title: `Fix the bank details of ${find(es, i.employeeId)
          .fullName}`, detail: i.plainReason.en,
        due: PAY_CALENDAR.approveBy, subject: i.employeeId,
        target: "pay/this-month" })];
    }
    return i.fixKind === "confirm-pension" ? [mkTask({ assignee: hr,
      kind: "issue", id: `${i.code}/${k}`, title: i.title,
      detail: i.plainReason.en, due: null, target: "pay/this-month" })]
      : [];
  });
  const offers = d.offers.flatMap((o) => o.status === "draft" ? [mkTask({
    assignee: hr, kind: "offer", id: o.id, title: `Approve and send the ` +
      `offer to ${o.candidateName}`, detail: `${o.title}, ${o.grossText} ` +
      `a month, starts ${o.joiningDate.display}`,
    due: addDays(o.preparedOn.iso, 3), target: `people/hiring/${o.id}` })]
    : o.status === "sent" ? [mkTask({ assignee: hr, kind: "offer",
      id: o.id, title: `Follow up the offer to ${o.candidateName}`,
      detail: `${o.title}; open until ${o.validUntil!.display}`,
      due: o.validUntil!.iso, target: `people/hiring/${o.id}` })] : []);
  const moves = d.moves.filter((m) => m.kind === "transfer" &&
    m.status === "approved" && m.effectiveOn.iso > AS_OF).flatMap((m) => [
    mkTask({ assignee: hr, kind: "move", id: m.id,
      title: `Update ${m.personName}'s record for the move`,
      detail: `Moves on ${m.effectiveOn.display}: ${m.to.text}`,
      due: addDays(m.effectiveOn.iso, -7), subject: m.employeeId,
      target: "people/moves" }),
    ...(m.from.location === m.to.location ? [] : [mkTask({ assignee: it,
      kind: "move", id: `${m.id}/access`, title: `Set up ` +
        `${m.personName}'s access at ${placeText(m.to.location)}`,
      detail: `Moves on ${m.effectiveOn.display}`,
      due: addDays(m.effectiveOn.iso, -3), subject: m.employeeId,
      target: "people/moves" })])]);
  const talks = d.candidates.flatMap((x) => x.interviews.flatMap((i) => {
    if (i.outcome !== "scheduled" && i.outcome !== "awaiting-feedback") {
      return [];
    }
    const book = i.outcome === "scheduled";
    return i.panel.map((p) => mkTask({ assignee: p.employeeId,
      kind: "interview", id: `${x.id}/${i.date.iso}`,
      title: book ? `Interview ${x.name} for ${x.requisitionTitle}`
        : `Send your feedback on ${x.name}`,
      detail: `Interview on ${i.date.display}`,
      due: book ? i.date.iso : addDays(i.date.iso, 5),
      target: "people/hiring" }));
  }));
  return [...docs, ...issues, ...offers, ...moves, ...talks];
}

function growthTasks(c: DemoCompany): HomeTask[] {
  const cy = appraisalCycleViews(c).find((x) => x.status === "open")!;
  const reviews = appraisalViews(c, { cycleId: cy.id }).flatMap((a) => {
    if (a.status === "not-started") {
      return [mkTask({ assignee: a.employeeId, kind: "appraisal",
        id: a.id, title: "Complete your self-assessment",
        detail: `${cy.name}, due ${cy.selfDueOn.display}`,
        due: cy.selfDueOn.iso, subject: a.employeeId,
        target: `me/appraisal/${a.id}` })];
    }
    return a.reviewerId === null ? [] : [mkTask({ assignee: a.reviewerId,
      kind: "appraisal", id: a.id, title: `Review ${a.employeeName}'s ` +
        "self-assessment", detail: `${cy.name}, due ` +
        cy.managerDueOn.display, due: cy.managerDueOn.iso,
      subject: a.employeeId, target: `people/growth/${a.id}` })];
  });
  return reviews;
}

const cmp = (a: HomeTask, b: HomeTask): number => {
  if (a.status !== b.status) return a.status === "open" ? -1 : 1;
  const x = a.dueOn?.iso ?? "9999";
  const y = b.dueOn?.iso ?? "9999";
  return x === y ? (a.id < b.id ? -1 : 1) : x < y ? -1 : 1;
};

const taskCache = new WeakMap<object, HomeTask[]>();

function allTasks(c: DemoCompany): HomeTask[] {
  const hit = taskCache.get(c);
  if (hit !== undefined) return hit;
  const out = [...approvalTasks(c), ...checklistTasks(c),
    ...peopleTasks(c), ...growthTasks(c)].sort(cmp);
  taskCache.set(c, out);
  return out;
}

/** Open tasks first, soonest due first; done ones at the end. */
export const homeTasksForEmployee = (c: DemoCompany, employeeId: string)
  : HomeTask[] => allTasks(c).filter((t) => t.assigneeId === employeeId);

export const homeTasksFor = (c: DemoCompany, role: HomeRole): HomeTask[] =>
  homeTasksForEmployee(c, personaId(c, role));

export interface HomeNotification {
  id: string;
  assigneeId: string;
  createdOn: DisplayDate;
  agoText: string;
  level: "info" | "action" | "warning";
  title: string;
  body: string;
  read: boolean;
  source: { kind: string; id: string };
  target: string;
}

type NoteIn = [string, HomeNotification["level"], string, string, boolean,
  string, string, string];

const ago = (iso: string): string => {
  const n = daysBetween(iso, AS_OF);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : `${n} days ago`;
};

function notesOf(c: DemoCompany, role: HomeRole): NoteIn[] {
  const es = c.employees;
  const d = movesDataOf(c);
  const me = personaId(c, role);
  const run = c.approvals.find((a) => a.kind === "pay-run")!;
  const near = c.documents.filter((x) => x.daysLeft <= 30);
  const out: NoteIn[] = [];
  const add = (...n: NoteIn) => { out.push(n); };
  const docNote = (x: (typeof near)[number], mine: boolean) => {
    const name = find(es, x.employeeId).fullName;
    const kind = DOC_TEXT[x.kind]!;
    add(AS_OF, "warning", mine ? `Your ${kind} expires on ` +
      shortDateText(x.expiresOn) : `${name}'s ${kind} expires soon`,
    `${x.daysLeft} days left (${shortDateText(x.expiresOn)}).` +
      (mine ? " HR has started the renewal." : ""), false, "document",
    x.id, "people/papers");
  };
  if (role === "hr") {
    add(run.requestedOn, "info", "October pay run sent to the GM",
      `${find(es, run.checkerEmployeeId).fullName} has it for approval ` +
      `by ${shortDateText(PAY_CALENDAR.approveBy)}.`, true, "approval",
      run.id, `approvals/${run.id}`);
    near.forEach((x) => docNote(x, false));
    for (const i of issuesOf(c).filter((x) => x.kind === "issue" &&
      x.fixKind === "enter-iban" && x.employeeId !== null)) {
      add(AS_OF, "warning", `${find(es, i.employeeId!).fullName}: bank ` +
        "details to fix", i.plainReason.en, false, "issue", i.code,
        "pay/this-month");
    }
    for (const l of [...d.joiners, ...d.leavers]) {
      for (const i of l.items.filter((x) => x.state === "overdue" &&
        x.ownerRole === "hr")) {
        add(addDays(i.dueOn.iso, 1), "warning", `${i.label}: ` +
          l.personName, `Was due on ${i.dueOn.display}.`, false,
        "checklist", `${l.id}/${i.key}`, `people/moves/${l.id}`);
      }
    }
    for (const o of d.offers) {
      if (o.status === "sent") {
        add(o.sentOn!.iso, "action", `Offer to ${o.candidateName}`,
          `Waiting for an answer; open until ${o.validUntil!.display}.`,
          false, "offer", o.id, `people/hiring/${o.id}`);
      } else if (o.status === "accepted" && o.employeeId === null) {
        add(o.respondedOn!.iso, "info", `${o.candidateName} accepted ` +
          "the offer", `Joins on ${o.joiningDate.display}.`,
        o.respondedOn!.iso <= addDays(AS_OF, -2), "offer", o.id,
        `people/hiring/${o.id}`);
      }
    }
  } else if (role === "gm") {
    for (const a of c.approvals.filter((x) =>
      x.checkerEmployeeId === me)) {
      const maker = find(es, a.makerEmployeeId).fullName;
      add(a.requestedOn, "action", a.kind === "pay-run"
        ? "October pay run needs your decision"
        : `${find(es, a.employeeId!).fullName}'s expense claim`,
      a.kind === "pay-run" ? `${maker} sent it for approval.`
        : `Claim of ${formatAed(a.amount!)}, waiting for you.`, false,
      "approval", a.id, `approvals/${a.id}`);
    }
    for (const l of d.leavers) {
      add(addDays(l.lastWorkingDay.iso, 4), "info", `Final settlement ` +
        `for ${l.personName}`, `${l.settlement.total.display} is due on ` +
        `${l.settlement.dueOn.display}.`, false, "checklist",
      `${l.id}/pay-settlement`, `people/moves/${l.id}`);
    }
    for (const o of d.offers.filter((x) =>
      x.approvedBy?.employeeId === me)) {
      add(o.approvedBy!.on.iso, "info", `You approved the offer for ` +
        `${o.candidateName}`, `${o.title}, starts ${o.joiningDate.display}.`,
      true, "offer", o.id, `people/hiring/${o.id}`);
    }
    const cy = appraisalCycleViews(c).find((x) => x.status === "open")!;
    add(cy.opensOn.iso, "info", `${cy.name} is open`,
      `${cy.progressText}.`, true, "appraisal", cy.id, "people/growth");
  } else if (role === "it") {
    for (const l of [...d.joiners, ...d.leavers]) {
      for (const i of l.items.filter((x) => x.ownerRole === "it")) {
        const done = i.state === "done";
        add(done ? i.doneOn!.iso : AS_OF, "info", `${i.label}: ` +
          l.personName, done ? `Done on ${i.doneOn!.display}.`
          : `Due on ${i.dueOn.display}.`, done, "checklist",
        `${l.id}/${i.key}`, `people/moves/${l.id}`);
      }
    }
    for (const m of d.moves.filter((x) => x.kind === "transfer" &&
      x.status === "approved" && x.from.location !== x.to.location)) {
      add(AS_OF, "info", `Access for ${m.personName}`, `Moves to ` +
        `${placeText(m.to.location)} on ${m.effectiveOn.display}.`,
      false, "move", m.id, "people/moves");
    }
  } else if (role === "manager") {
    for (const a of c.approvals.filter((x) =>
      x.checkerEmployeeId === me)) {
      const r = c.leaveRequests.find((x) => x.id === a.subjectId);
      add(a.requestedOn, "action", `${find(es, a.employeeId!).fullName} ` +
        (r === undefined ? "sent an expense claim" : "asked for leave"),
      r === undefined ? `${formatAed(a.amount!)}, waiting for you.`
        : `${shortDateText(r.startDate)} to ${shortDateText(r.endDate)}.`,
      false, "approval", a.id, `approvals/${a.id}`);
    }
    const team = directReportsOf(c, me).map((x) => x.employeeId);
    near.filter((x) => team.includes(x.employeeId))
      .forEach((x) => docNote(x, false));
    const cy = appraisalCycleViews(c).find((x) => x.status === "open")!;
    const waiting = appraisalViews(c, { cycleId: cy.id }).filter((a) =>
      a.reviewerId === me && a.status === "self-done").length;
    add(AS_OF, waiting > 0 ? "action" : "info", `${plural(waiting,
      "self-assessment", "self-assessments")} to review`,
    `${cy.name}: review by ${cy.managerDueOn.display}.`, false,
    "appraisal", cy.id, "people/growth");
  } else {
    near.filter((x) => x.employeeId === me).forEach((x) =>
      docNote(x, true));
    const ts = c.timesheets.find((t) => t.employeeId === me);
    if (ts !== undefined && ts.overtimeMinutes > 0) {
      add(AS_OF, "info", "October overtime recorded",
        `${duration(ts.overtimeMinutes)} of overtime so far in October.`,
        false, "timesheet", ts.month, "me/time");
    }
    add(PAY_CALENDAR.cutOff, "info", "October salary date",
      `Payday is planned for ${shortDateText(PAY_CALENDAR.payday)}.`,
      true, "pay-calendar", "payday", "me/payslips");
    const cy = appraisalCycleViews(c).find((x) => x.status === "open")!;
    const mine = appraisalViews(c, { cycleId: cy.id, employeeId: me })[0];
    if (mine !== undefined) {
      add(cy.opensOn.iso, mine.status === "not-started" ? "action"
        : "info", mine.status === "not-started"
        ? "Complete your self-assessment" : "Self-assessment sent",
      `${cy.name}, due ${cy.selfDueOn.display}.`,
      mine.status !== "not-started", "appraisal", mine.id,
      `me/appraisal/${mine.id}`);
    }
  }
  return out;
}

const noteCache = new WeakMap<object, Map<HomeRole, HomeNotification[]>>();

/** Newest first. */
export function homeNotificationsFor(c: DemoCompany, role: HomeRole)
  : HomeNotification[] {
  const store = noteCache.get(c) ?? new Map();
  noteCache.set(c, store);
  const hit = store.get(role);
  if (hit !== undefined) return hit;
  const rows = notesOf(c, role).map((n, i) => ({ n, i }))
    .sort((a, b) => a.n[0] === b.n[0] ? a.i - b.i
      : a.n[0] < b.n[0] ? 1 : -1);
  const out = rows.map(({ n }, k): HomeNotification => ({
    id: `note-${role}-${k + 1}`, assigneeId: personaId(c, role),
    createdOn: shortDateOf(n[0]), agoText: ago(n[0]), level: n[1],
    title: n[2], body: n[3], read: n[4],
    source: { kind: n[5], id: n[6] }, target: n[7] }));
  store.set(role, out);
  return out;
}

export const unreadNotificationCount = (c: DemoCompany, role: HomeRole)
  : number => homeNotificationsFor(c, role).filter((n) => !n.read).length;

export interface HomeNotice {
  id: string;
  title: string;
  body: string;
  category: "pay" | "people" | "growth" | "safety" | "holiday";
  postedOn: DisplayDate;
  postedBy: { employeeId: string; name: string };
  pinned: boolean;
  expiresOn: DisplayDate | null;
  /** "all", or the places that see it. */
  audience: "all" | string[];
  audienceText: string;
}

const HQ = "hq-abu-dhabi";

function noticesOf(c: DemoCompany): HomeNotice[] {
  const es = c.employees;
  const hr = find(es, personaId(c, "hr"));
  const gm = find(es, personaId(c, "gm"));
  const hire = es.find((e) => e.cases.includes("probation"))!;
  const leaver = es.find((e) => e.cases.includes("leaver"))!;
  const cy = appraisalCycleViews(c).find((x) => x.status === "open")!;
  const move = movesDataOf(c).moves.find((m) => m.kind === "transfer" &&
    m.status === "approved")!;
  const years = Math.floor(daysBetween(leaver.joiningDate,
    leaver.leavingDate!) / 365.25);
  const n = (id: string, who: DemoEmployee, on: string, exp: string | null,
    pinned: boolean, category: HomeNotice["category"], title: string,
    body: string, audience: "all" | string[] = "all"): HomeNotice => ({
    id, title, body, category, postedOn: shortDateOf(on),
    postedBy: { employeeId: who.id, name: who.fullName }, pinned,
    expiresOn: exp === null ? null : shortDateOf(exp), audience,
    audienceText: audience === "all" ? "Everyone"
      : `${audience.map(placeText).join(" and ")}${audience.length === 1
        && audience[0] === HQ ? " only" : ""}` });
  return [
    n("notice-001", hr, "2026-10-15", PAY_CALENDAR.payday, true, "pay",
      "October salary date and cut-off", "Payday for October is planned " +
      `for ${shortDateText(PAY_CALENDAR.payday)}. Changes ` +
      `sent after ${shortDateText(PAY_CALENDAR.cutOff)} go to the ` +
      "November pay run."),
    n("notice-002", hr, cy.opensOn.iso, cy.closesOn.iso, true, "growth",
      `${cy.name} is open`, `Finish your self-assessment by ` +
      `${cy.selfDueOn.display}. Managers review by ` +
      `${cy.managerDueOn.display}.`),
    n("notice-003", hr, hire.joiningDate, addDays(hire.joiningDate, 30),
      false, "people", `Welcome ${hire.fullName}`, `${hire.fullName} ` +
      `joined on ${shortDateText(hire.joiningDate)} as a ` +
      `${jobTitleText(hire.jobKey).toLowerCase()} at the ` +
      `${placeText(hire.location)}. Please say hello.`),
    n("notice-004", gm, addDays(leaver.leavingDate!, -1),
      addDays(leaver.leavingDate!, 14), false, "people",
      `Farewell ${leaver.fullName}`, `${leaver.fullName} leaves the ` +
      `bank on ${shortDateText(leaver.leavingDate!)} after ` +
      `${plural(years, "year", "years")}. Thank you for your work.`),
    n("notice-005", hr, "2026-10-22", "2026-11-04", false, "safety",
      "Fire drill at the head office", "Fire drill on 4 Nov 2026 at " +
      "10:00. Use the stairs and meet at the car park.", [HQ]),
    n("notice-006", gm, "2026-10-20", "2026-12-03", false, "holiday",
      "UAE National Day holiday", "The dates follow the official " +
      "announcement. Sample planning dates: 2 and 3 Dec 2026."),
    n("notice-007", hr, "2026-10-20", move.effectiveOn.iso, false,
      "people", `${move.personName} moves branch`, `${move.summary}, ` +
      `from ${move.effectiveOn.display}.`,
    [move.from.location, move.to.location]),
    n("notice-008", hr, "2026-09-28", "2026-10-12", false, "pay",
      "September payslips are ready", "September payslips are in the " +
      "payslips page.")];
}

export function homeNoticesForEmployee(c: DemoCompany, employeeId: string)
  : HomeNotice[] {
  const place = find(c.employees, employeeId).location;
  return noticesOf(c).filter((x) => x.postedOn.iso <= AS_OF &&
    (x.expiresOn === null || x.expiresOn.iso >= AS_OF) &&
    (x.audience === "all" || x.audience.includes(place)))
    .sort((a, b) => a.pinned !== b.pinned ? (a.pinned ? -1 : 1)
      : a.postedOn.iso < b.postedOn.iso ? 1 : -1);
}

export const homeNoticesFor = (c: DemoCompany, role: HomeRole)
  : HomeNotice[] => homeNoticesForEmployee(c, personaId(c, role));

export interface HomeSummary {
  role: HomeRole;
  employeeId: string;
  name: string;
  openTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
  unreadNotifications: number;
  pendingApprovals: number;
  notices: number;
  text: string;
}

/** The counts on the home page; each is the length of a list. */
export function homeSummary(c: DemoCompany, role: HomeRole): HomeSummary {
  const p = homeRolePersonas(c).find((x) => x.role === role)!;
  const tasks = homeTasksFor(c, role).filter((t) => t.status === "open");
  const overdue = tasks.filter((t) => t.urgency === "overdue").length;
  const unread = unreadNotificationCount(c, role);
  const pending = c.approvals.filter((a) =>
    a.checkerEmployeeId === p.employeeId).length;
  return { role, employeeId: p.employeeId, name: p.name,
    openTasks: tasks.length, overdueTasks: overdue,
    dueThisWeek: tasks.filter((t) => t.urgency === "soon").length,
    unreadNotifications: unread, pendingApprovals: pending,
    notices: homeNoticesFor(c, role).length,
    text: `${plural(tasks.length, "open task", "open tasks")} ` +
      `(${overdue} overdue), ${plural(unread, "unread notification",
        "unread notifications")}, ${plural(pending, "approval",
        "approvals")} waiting for you` };
}

export interface TeamTodayRow {
  employeeId: string;
  name: string;
  title: string;
  status: DayStatus | "no-record";
  statusText: string;
}

/** E10: the manager's own people, from today's attendance. */
export function teamToday(c: DemoCompany, managerId: string)
  : TeamTodayRow[] {
  return directReportsOf(c, managerId).map((p) => {
    const day = c.attendance.find((a) => a.employeeId === p.employeeId &&
      a.date === AS_OF);
    const status = day?.status ?? "no-record";
    const text = day === undefined ? "No record today"
      : day.status === "present" ? `At work since ` +
        (day.clockIn ?? "").slice(11, 16)
      : day.status === "leave" ? "On leave" : "Away, unpaid day";
    return { employeeId: p.employeeId, name: p.name, title: p.title,
      status, statusText: text };
  });
}

export interface MyDocumentView {
  id: string;
  employeeId: string;
  employeeName: string;
  kind: string;
  kindText: string;
  number: string;
  expiresOn: DisplayDate;
  daysLeft: number;
  state: string;
  text: string;
}

/** E05 and the expiry card: documents with plain dates. */
export function myDocumentViews(c: DemoCompany, employeeId?: string)
  : MyDocumentView[] {
  return c.documents.filter((d) => employeeId === undefined ||
    d.employeeId === employeeId).map((d) => ({ id: d.id,
    employeeId: d.employeeId,
    employeeName: find(c.employees, d.employeeId).fullName, kind: d.kind,
    kindText: DOC_TEXT[d.kind]!, number: d.number.masked,
    expiresOn: shortDateOf(d.expiresOn), daysLeft: d.daysLeft,
    state: d.state, text: `${DOC_TEXT[d.kind]!}: expires on ` +
      `${shortDateText(d.expiresOn)}, in ${plural(d.daysLeft, "day",
        "days")}` }));
}
