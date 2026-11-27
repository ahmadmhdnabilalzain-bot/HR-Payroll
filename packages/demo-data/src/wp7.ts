import {
  addDays,
  fils,
  formatAed,
  parseIsoDate,
  type Fils,
} from "@payroll/engine";
import {
  AS_OF,
  isWorkingDay,
  monthKey,
  workingDaysBetween,
} from "./calendar";
import { DEMO_LABELS, isDemoLabelKey } from "./labels";
import { HISTORY_SICK, pastMonthSlips, type PastPayslip } from "./pay";
import { BACK_PAY_RAISE } from "./roster";
import { employeeById } from "./selectors";
import type { DemoCompany, DemoEmployee } from "./types";

/* ---------------------------------------------------------------- *
 * Display dates: "27 Oct 2026" (the older displayDate drops the year)
 * ---------------------------------------------------------------- */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"];

/** "27 Oct 2026" from an ISO date or timestamp. */
export function reportDate(iso: string): string {
  const d = parseIsoDate(iso.slice(0, 10));
  return `${d.d} ${MON[d.m - 1]} ${d.y}`;
}

/** "Oct 2026" from "2026-10". */
export function reportMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MON[m! - 1]} ${y}`;
}

const signed = (a: bigint): string =>
  `${a < 0n ? "-" : "+"}${formatAed(fils(a < 0n ? -a : a))}`;

const pct = (part: bigint, whole: bigint): string => {
  if (whole === 0n) return "0.0%";
  const tenths = (part * 2000n / whole + (part < 0n ? -1n : 1n)) / 2n;
  const t = Number(tenths) / 10;
  return `${t < 0 ? "-" : "+"}${Math.abs(t).toFixed(1)}%`;
};

/* ---------------------------------------------------------------- *
 * SHA-256 (pure, so the demo needs no platform crypto)
 * ---------------------------------------------------------------- */

const primes = (n: number): number[] => {
  const out: number[] = [];
  for (let p = 2; out.length < n; p++) {
    if (out.every((q) => p % q !== 0)) out.push(p);
  }
  return out;
};
const frac32 = (x: number): number =>
  Math.floor((x - Math.floor(x)) * 4294967296);
const K = primes(64).map((p) => frac32(Math.cbrt(p)));
const H0 = primes(8).map((p) => frac32(Math.sqrt(p)));
const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 of a UTF-8 string, as 64 hex characters. */
export function sha256Hex(text: string): string {
  const msg = Array.from(new TextEncoder().encode(text));
  const bits = msg.length * 8;
  msg.push(0x80);
  while (msg.length % 64 !== 56) msg.push(0);
  for (const word of [Math.floor(bits / 4294967296), bits >>> 0]) {
    for (let s = 24; s >= 0; s -= 8) msg.push((word >>> s) & 255);
  }
  let h = [...H0];
  for (let o = 0; o < msg.length; o += 64) {
    const w = new Array<number>(64).fill(0);
    for (let i = 0; i < 16; i++) {
      w[i] = ((msg[o + 4 * i]! << 24) | (msg[o + 4 * i + 1]! << 16) |
        (msg[o + 4 * i + 2]! << 8) | msg[o + 4 * i + 3]!) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!;
      const b = w[i - 2]!;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number,
      number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
        ((e & f) ^ (~e & g)) + K[i]! + w[i]!) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) +
        ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h = h.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]!) >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("");
}

/* ---------------------------------------------------------------- *
 * Audit trail
 * ---------------------------------------------------------------- */

export type AuditArea = "pay" | "people" | "time" | "access" | "setup";

export interface AuditEvent {
  id: string;
  /** 1-based position in the chain. */
  seq: number;
  /** ISO timestamp, Dubai time (UTC+4), to the minute. */
  at: string;
  /** An employee id, or null for the system itself. */
  actorId: string | null;
  action: string;
  area: AuditArea;
  subject: { kind: string; id: string; label: string };
  summary: string;
  prevHash: string;
  hash: string;
}

export const AUDIT_CHAIN_NOTE = "Each entry's fingerprint " +
  "(SHA-256) is worked out from the entry and the one before it when " +
  "the page loads, so a changed or removed entry shows up when the " +
  "chain is checked. It shows the idea; it is not a legal proof, and " +
  "a real system would keep the chain on a server.";

const GENESIS = "0".repeat(64);

const hashOf = (e: Omit<AuditEvent, "hash">): string => sha256Hex(
  [e.prevHash, e.seq, e.at, e.actorId ?? "system", e.action,
    e.subject.id, e.summary].join("|"));

/**
 * Facts about access that the Setup (WP9) data must agree with: the
 * audit log records them, so users, keys and hooks read them from here.
 */
export const ACCESS_FACTS = {
  firstInvites: { on: "2026-01-12", by: "emp-001",
    users: ["emp-028", "emp-030"] },
  graceRole: { on: "2026-02-09", by: "emp-030", employeeId: "emp-029",
    from: "Employee", to: "HR officer" },
  jumaRole: { on: "2026-09-30", by: "emp-030", employeeId: "emp-027",
    from: "Finance clerk", to: "Finance, read only" },
  mfaRequired: { on: "2026-02-02", by: "emp-030" },
  apiKeys: [
    { id: "key-001", on: "2026-03-03", at: "11:15", by: "emp-030",
      name: "Payroll export (read only)" },
    { id: "key-002", on: "2026-06-15", at: "10:20", by: "emp-030",
      name: "Finance dashboard (read only)" }],
  webhooks: [
    { id: "hook-001", on: "2026-04-20", at: "15:30", by: "emp-030",
      name: "Pay run signed off, to the finance system" },
    { id: "hook-002", on: "2026-07-08", at: "14:05", by: "emp-030",
      name: "New starter, to the IT service desk" }],
  review: { on: "2026-09-30", by: "emp-001", checked: 12, narrowed: 1 },
} as const;

type Draft = Omit<AuditEvent, "id" | "seq" | "prevHash" | "hash">;

const nameOf = (c: DemoCompany, id: string): string =>
  employeeById(c, id).fullName;

/** The most senior person of the same department decides (as in the
 * approvals inbox); the GM when no one is more senior. */
function deciderOf(c: DemoCompany, id: string): string {
  const e = employeeById(c, id);
  const senior = c.employees.filter((x) =>
    x.departmentId === e.departmentId && x.grade > e.grade)
    .sort((a, b) => b.grade - a.grade);
  const local = senior.filter((x) => x.location === e.location);
  return (local[0] ?? senior[0])?.id ?? "emp-001";
}

const at = (date: string, hhmm: string): string =>
  `${date}T${hhmm}:00+04:00`;

/** [requested, decided] for each leave request, by request id. */
const LEAVE_LOG: Record<string, [string, string | null]> = {
  "lr-001": [at("2026-10-07", "09:12"), at("2026-10-08", "10:30")],
  "lr-002": [at("2026-10-20", "08:15"), at("2026-10-20", "09:10")],
  "lr-003": [at("2026-03-26", "14:00"), at("2026-03-30", "09:30")],
  "lr-004": [at("2026-10-27", "10:05"), null],
  "lr-005": [at("2026-10-27", "10:12"), null],
  "lr-006": [at("2026-10-23", "16:40"), at("2026-10-26", "15:10")],
};

const lastWorkingDayBefore = (date: string): string => {
  let d = addDays(date, -1);
  while (!isWorkingDay(d)) d = addDays(d, -1);
  return d;
};
const nextWorkingDay = (date: string): string => {
  let d = addDays(date, 1);
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
};

function leaveDrafts(c: DemoCompany): Draft[] {
  return c.leaveRequests.flatMap((r) => {
    const [asked, decided] = LEAVE_LOG[r.id] ?? [null, null];
    if (asked === null) return [];
    const type = c.leaveTypes.find((t) => t.id === r.leaveTypeId)!;
    const kind = type.id.replace("lt-", "");
    const what = `${kind} leave ${reportDate(r.startDate)} to ` +
      `${reportDate(r.endDate)}`;
    const subject = { kind: "leave", id: r.id,
      label: `${nameOf(c, r.employeeId)}, ${what}` };
    const out: Draft[] = [{ at: asked, actorId: r.employeeId,
      action: "leave.requested", area: "time", subject,
      summary: `${nameOf(c, r.employeeId)} asked for ${what}` }];
    if (decided !== null && r.status !== "pending") {
      const by = deciderOf(c, r.employeeId);
      // Internal sign-offs: "signed off" or "declined", never "approved".
      const ok = r.status === "approved";
      out.push({ at: decided, actorId: by,
        action: ok ? "leave.signed-off" : "leave.declined", area: "time",
        subject, summary: `${nameOf(c, by)} ${ok ? "signed off"
          : "declined"} ${nameOf(c, r.employeeId)}'s ${what}` });
    }
    return out;
  });
}

function expenseDrafts(c: DemoCompany): Draft[] {
  return c.expenses.flatMap((x) => {
    const subject = { kind: "expense", id: x.id,
      label: `${nameOf(c, x.employeeId)}, ${formatAed(x.amount)}` };
    const who = nameOf(c, x.employeeId);
    const asked: Draft = { at: at(x.date, x.status === "pending"
      ? "10:50" : "15:20"), actorId: x.employeeId,
    action: "expense.submitted", area: "pay", subject,
    summary: `${who} submitted an expense claim of ${formatAed(x.amount)}` };
    if (x.status === "pending") return [asked];
    const by = deciderOf(c, x.employeeId);
    return [asked, { at: at(addDays(x.date, 1), "09:40"), actorId: by,
      action: "expense.signed-off", area: "pay", subject,
      summary: `${nameOf(c, by)} signed off ${who}'s claim of ` +
        formatAed(x.amount) }];
  });
}

function payRunDrafts(c: DemoCompany): Draft[] {
  const run = payrollHistory(c);
  const gm = nameOf(c, "emp-001");
  const out: Draft[] = [];
  for (const m of run.slice(0, 9)) {
    const signed = lastWorkingDayBefore(`${m.month}-27`);
    const subject = { kind: "pay-run", id: `run-${m.month}`,
      label: `Pay run ${reportMonth(m.month)}` };
    const figures = `net ${formatAed(m.net)}, ${m.headcount} people`;
    out.push(
      { at: at(lastWorkingDayBefore(signed), "16:10"),
        actorId: "emp-028", action: "payrun.submitted", area: "pay",
        subject, summary: `Pay run for ${reportMonth(m.month)} sent to ` +
          `${gm} for sign-off: ${figures}` },
      { at: at(signed, "11:20"), actorId: "emp-001",
        action: "payrun.signed-off", area: "pay", subject,
        summary: `${gm} signed off the pay run for ` +
          `${reportMonth(m.month)}: ${figures}` },
      { at: at(nextWorkingDay(signed), "10:05"), actorId: "emp-028",
        action: "wps.file-sent", area: "pay", subject,
        summary: `Salary file for ${reportMonth(m.month)} marked as ` +
          `sent to the bank` });
  }
  const oct = c.payRun;
  const ap = c.approvals.find((a) => a.kind === "pay-run")!;
  const octSubject = { kind: "pay-run", id: oct.id,
    label: `Pay run ${reportMonth(monthKey(oct.year, oct.month))}` };
  out.push(
    { at: at(AS_OF, "09:28"), actorId: null, action: "payrun.calculated",
      area: "pay", subject: octSubject, summary: `Pay run for ` +
        `${reportMonth(octSubject.id.slice(4))} calculated for ` +
        `${oct.totals.payslips} people` },
    { at: at(AS_OF, "09:30"), actorId: ap.makerEmployeeId,
      action: "wps.file-created", area: "pay",
      subject: { kind: "sif", id: c.sif.fileName,
        label: c.sif.fileName },
      summary: `Salary file ${c.sif.fileName} created with ` +
        `${c.sif.recordCount} records and ${c.sif.findings.length} ` +
        `findings to review` },
    { at: at(AS_OF, "09:42"), actorId: ap.makerEmployeeId,
      action: "payrun.submitted", area: "pay", subject: octSubject,
      summary: `Pay run for ${reportMonth(octSubject.id.slice(4))} ` +
        `sent to ${nameOf(c, ap.checkerEmployeeId)} for sign-off` });
  return out;
}

function peopleDrafts(c: DemoCompany): Draft[] {
  const hire = c.employees.find((e) => e.cases.includes("probation"))!;
  const leaver = c.employees.find((e) => e.cases.includes("leaver"))!;
  const back = c.payRun.backPay[0]!;
  const raised = employeeById(c, back.employeeId);
  const person = (e: DemoEmployee) => ({ kind: "employee", id: e.id,
    label: e.fullName });
  const raise = formatAed(fils(BACK_PAY_RAISE));
  const settle = c.payRun.settlements.find((s) =>
    s.employeeId === leaver.id)!;
  return [
    { at: at("2026-08-26", "10:15"), actorId: "emp-001",
      action: "salary.signed-off", area: "people",
      subject: person(raised),
      summary: `${nameOf(c, "emp-001")} signed off a raise of ${raise} to ` +
        `${raised.fullName}'s basic salary, from ${reportDate(
          "2026-09-01")}` },
    { at: at("2026-09-18", "09:05"), actorId: "emp-029",
      action: "employee.resignation-recorded", area: "people",
      subject: person(leaver), summary: `${leaver.fullName}: resignation ` +
        `recorded, last working day ${reportDate(leaver.leavingDate!)}` },
    { at: at("2026-10-05", "09:20"), actorId: "emp-029",
      action: "employee.created", area: "people", subject: person(hire),
      summary: `${hire.fullName} added; joins ${reportDate(
        hire.joiningDate)}, probation to ${reportDate(
        hire.probationEndDate!)}` },
    { at: at("2026-10-16", "11:30"), actorId: "emp-028",
      action: "settlement.prepared", area: "pay", subject: person(leaver),
      summary: `Final settlement drafted for ${leaver.fullName}: ` +
        `${formatAed(settle.result.total)}, outside the pay run` },
    { at: at("2026-10-05", "11:40"), actorId: "emp-028",
      action: "salary.revised", area: "people", subject: person(raised),
      summary: `${raised.fullName}'s basic salary raised by ${raise} ` +
        `from ${reportDate("2026-09-01")}, entered late; back pay of ` +
        `${formatAed(back.amount)} is in the October run` },
  ];
}

function accessDrafts(c: DemoCompany): Draft[] {
  const f = ACCESS_FACTS;
  const user = (id: string) => ({ kind: "user", id: `usr-${id.slice(4)}`,
    label: nameOf(c, id) });
  const invite = (id: string, role: string, time: string): Draft => ({
    at: at(f.firstInvites.on, time), actorId: f.firstInvites.by,
    action: "access.user-invited", area: "access", subject: user(id),
    summary: `${nameOf(c, f.firstInvites.by)} invited ${nameOf(c, id)} ` +
      `as ${role}` });
  const role = (x: { on: string; by: string; employeeId: string;
    from: string; to: string }, verb: string, time: string): Draft => ({
    at: at(x.on, time), actorId: x.by, action: "access.role-changed",
    area: "access", subject: user(x.employeeId),
    summary: `${nameOf(c, x.employeeId)}: role ${verb} from ${x.from} ` +
      `to ${x.to}` });
  return [
    invite("emp-028", "HR manager", "10:02"),
    invite("emp-030", "IT administrator", "10:05"),
    { at: at(f.mfaRequired.on, "09:40"), actorId: f.mfaRequired.by,
      action: "setup.mfa-required", area: "setup",
      subject: { kind: "setting", id: "mfa-admin",
        label: "Second sign-in step" },
      summary: "Second sign-in step made compulsory for admin roles" },
    role(f.graceRole, "changed", "14:20"),
    ...f.apiKeys.map((k): Draft => ({ at: at(k.on, k.at),
      actorId: k.by, action: "access.api-key-created", area: "access",
      subject: { kind: "api-key", id: k.id, label: k.name },
      summary: `API key "${k.name}" created` })),
    ...f.webhooks.map((w): Draft => ({ at: at(w.on, w.at),
      actorId: w.by, action: "access.webhook-created", area: "access",
      subject: { kind: "webhook", id: w.id, label: w.name },
      summary: `Webhook "${w.name}" created` })),
    role(f.jumaRole, "narrowed", "15:40"),
    { at: at(f.review.on, "16:00"), actorId: f.review.by,
      action: "access.review-completed", area: "access",
      subject: { kind: "access-review", id: `review-${f.review.on}`,
        label: `Access review ${reportDate(f.review.on)}` },
      summary: `Access review done: ${f.review.checked} users checked, ` +
        `${f.review.narrowed} role narrowed` },
  ];
}

const cache = new WeakMap<DemoCompany, AuditEvent[]>();

/** The audit log, oldest first, each entry chained to the one before. */
export function auditEvents(c: DemoCompany): AuditEvent[] {
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  const drafts = [...accessDrafts(c), ...payRunDrafts(c),
    ...peopleDrafts(c), ...leaveDrafts(c), ...expenseDrafts(c)]
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d.at.localeCompare(b.d.at) || a.i - b.i)
    .map((x) => x.d);
  let prev = GENESIS;
  const out = drafts.map((d, i): AuditEvent => {
    const base = { ...d, id: `aud-${String(i + 1).padStart(4, "0")}`,
      seq: i + 1, prevHash: prev };
    const e = { ...base, hash: hashOf(base) };
    prev = e.hash;
    return e;
  });
  cache.set(c, out);
  return out;
}

/** What an action in the demo adds to the trail (no seq or hashes). */
export type AuditDraft = Omit<AuditEvent, "id" | "seq" | "prevHash" |
  "hash">;

/**
 * The trail with entries made during the demo added at its end, each
 * chained to the one before (append only: nothing earlier changes, and
 * the chain check still passes at the new length).
 */
export function appendAuditEvents(events: readonly AuditEvent[],
  drafts: readonly AuditDraft[]): AuditEvent[] {
  let prev = events.at(-1)?.hash ?? GENESIS;
  const added = drafts.map((d, i): AuditEvent => {
    const seq = events.length + i + 1;
    const base = { ...d, id: `aud-${String(seq).padStart(4, "0")}`, seq,
      prevHash: prev };
    const e = { ...base, hash: hashOf(base) };
    prev = e.hash;
    return e;
  });
  return [...events, ...added];
}

/** Walks the chain; `brokenAt` is the 1-based position of the first bad one. */
export function verifyAuditChain(events: readonly AuditEvent[]):
  { ok: boolean; brokenAt: number | null; checked: number } {
  let prev = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.prevHash !== prev || e.hash !== hashOf(e)) {
      return { ok: false, brokenAt: i + 1, checked: i };
    }
    prev = e.hash;
  }
  return { ok: true, brokenAt: null, checked: events.length };
}

export interface AuditRow {
  id: string;
  /** "27 Oct 2026, 09:42". */
  when: string;
  who: string;
  area: AuditArea;
  action: string;
  summary: string;
  subjectLabel: string;
  /** "a1b2c3d4...90ab": the fingerprint, shortened. */
  shortHash: string;
  shortPrev: string;
}

const shorten = (h: string): string => `${h.slice(0, 8)}...${h.slice(-4)}`;

function whoOf(c: DemoCompany, id: string | null): string {
  if (id === null) return "System";
  const e = employeeById(c, id);
  const key = `job.${e.jobKey}`;
  const job = isDemoLabelKey(key) ? DEMO_LABELS.en[key] : e.jobKey;
  // The job title as written ("IT manager"): lower case read "it manager".
  return `${e.fullName}, ${job}`;
}

/** The audit screen's rows, newest last, with optional filters. */
export function auditRows(c: DemoCompany, filter: { area?: AuditArea;
  actorId?: string } = {}): AuditRow[] {
  return auditRowsOf(c, auditEvents(c).filter((e) =>
    (filter.area === undefined || e.area === filter.area) &&
    (filter.actorId === undefined || e.actorId === filter.actorId)));
}

/** Rows for any run of events (the trail plus the demo's entries). */
export function auditRowsOf(c: DemoCompany, events: readonly AuditEvent[])
  : AuditRow[] {
  return events.map((e) => ({ id: e.id,
    when: `${reportDate(e.at)}, ${e.at.slice(11, 16)}`,
    who: whoOf(c, e.actorId), area: e.area, action: e.action,
    summary: e.summary, subjectLabel: e.subject.label,
    shortHash: shorten(e.hash), shortPrev: shorten(e.prevHash) }));
}

/* ---------------------------------------------------------------- *
 * Monthly payroll history, January to October 2026
 * ---------------------------------------------------------------- */

export interface HistoryLine { employeeId: string; gross: Fils;
  net: Fils; overtimeMinutes: number; overtimeAmount: Fils;
  /** Back pay inside this month's gross (October only). */
  backPay: Fils }

export interface LeaveTaken { annual: number; sick: number;
  unpaid: number }

export interface MonthlyPayroll {
  /** "2026-03". */
  month: string;
  status: "paid" | "awaiting-approval";
  headcount: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  overtimeMinutes: number;
  overtimeAmount: Fils;
  /** Working days taken, by type, from approved leave and sick days. */
  leaveTaken: LeaveTaken;
  lines: HistoryLine[];
}

const sumF = (xs: readonly bigint[]): Fils => fils(xs.reduce((n, x) =>
  n + x, 0n));

function lineOf(s: PastPayslip): { line: HistoryLine; deductions: Fils } {
  const ot = s.payslip.earnings.filter((l) => l.kind === "overtime");
  return { deductions: s.payslip.totalDeductions, line: {
    employeeId: s.employeeId, gross: s.payslip.gross, net: s.payslip.net,
    overtimeMinutes: s.input.overtime.reduce((n, o) => n + o.minutes, 0),
    overtimeAmount: sumF(ot.map((l) => l.amount)), backPay: fils(0n) } };
}

function leaveTakenIn(c: DemoCompany, month: string): LeaveTaken {
  const days = (from: string, to: string) => workingDaysBetween(from, to)
    .filter((d) => d.startsWith(month)).length;
  const count = (type: string) => c.leaveRequests.filter((r) =>
    r.status === "approved" && r.leaveTypeId === type)
    .reduce((n, r) => n + days(r.startDate, r.endDate), 0);
  return { annual: count("lt-annual"), unpaid: count("lt-unpaid"),
    sick: count("lt-sick") + HISTORY_SICK.reduce((n, [, a, b]) =>
      n + days(a, b), 0) };
}

function octoberOf(c: DemoCompany): MonthlyPayroll {
  const run = c.payRun;
  const month = monthKey(run.year, run.month);
  const back = new Map(run.backPay.map((b) => [b.employeeId, b.amount]));
  const lines = run.payslips.map((s): HistoryLine => {
    const ot = s.payslip.earnings.filter((l) => l.kind === "overtime");
    return { employeeId: s.employeeId, gross: s.payslip.gross,
      net: s.payslip.net, overtimeMinutes: s.input.overtime
        .reduce((n, o) => n + o.minutes, 0),
      overtimeAmount: sumF(ot.map((l) => l.amount)),
      backPay: back.get(s.employeeId) ?? fils(0n) };
  });
  return rowOf(c, month, "awaiting-approval", lines,
    run.totals.deductions);
}

function rowOf(c: DemoCompany, month: string, status: MonthlyPayroll[
  "status"], lines: HistoryLine[], deductions: Fils): MonthlyPayroll {
  return { month, status, headcount: lines.length,
    gross: sumF(lines.map((l) => l.gross)), deductions,
    net: sumF(lines.map((l) => l.net)),
    overtimeMinutes: lines.reduce((n, l) => n + l.overtimeMinutes, 0),
    overtimeAmount: sumF(lines.map((l) => l.overtimeAmount)),
    leaveTaken: leaveTakenIn(c, month), lines };
}

const historyCache = new WeakMap<DemoCompany, MonthlyPayroll[]>();

/**
 * January to September 2026 are re-run through the engine from the
 * roster (pay and joining dates as they are today; the back-pay
 * employee on the old basic until September, as the back-pay figure
 * says). October is the run waiting for approval, as it is.
 */
export function payrollHistory(c: DemoCompany): MonthlyPayroll[] {
  const hit = historyCache.get(c);
  if (hit !== undefined) return hit;
  const past = Array.from({ length: 9 }, (_, i) => i + 1).map((m) => {
    const made = pastMonthSlips(c, m).map(lineOf);
    return rowOf(c, monthKey(2026, m), "paid", made.map((x) => x.line),
      sumF(made.map((x) => x.deductions)));
  });
  const out = [...past, octoberOf(c)];
  historyCache.set(c, out);
  return out;
}

export interface TrendRow {
  month: string;
  monthText: string;
  statusText: string;
  headcountText: string;
  grossText: string;
  netText: string;
  overtimeText: string;
  leaveText: string;
  /** Gross against the month before: "+AED 2,000.00 (+0.4%)". */
  changeText: string;
}

const days = (n: number): string => `${n} ${n === 1 ? "day" : "days"}`;

/** One row per month for the trend table and chart. */
export function trendRows(c: DemoCompany): TrendRow[] {
  const h = payrollHistory(c);
  return h.map((m, i) => {
    const before = h[i - 1];
    const l = m.leaveTaken;
    return { month: m.month, monthText: reportMonth(m.month),
      statusText: m.status === "paid" ? "Paid" : "Awaiting sign-off",
      headcountText: `${m.headcount} people`,
      grossText: formatAed(m.gross), netText: formatAed(m.net),
      overtimeText: m.overtimeMinutes === 0 ? "None"
        : `${m.overtimeMinutes / 60} hours, ${formatAed(m.overtimeAmount)}`,
      leaveText: `${days(l.annual)} annual, ${days(l.sick)} sick, ` +
        `${days(l.unpaid)} unpaid`,
      changeText: before === undefined ? "First month shown"
        : `${signed(m.gross - before.gross)} (${pct(m.gross - before.gross,
          before.gross)})` };
  });
}

/* ---------------------------------------------------------------- *
 * Variance: why the pay run moved
 * ---------------------------------------------------------------- */

export type DriverKey = "new-joiner" | "leaver" | "unpaid-leave" |
  "overtime" | "back-pay" | "salary-raise" | "sick-leave" | "other";

export interface VarianceDriver { key: DriverKey; label: string;
  amount: Fils; people: string[]; text: string }

export interface Variance {
  title: string;
  month: string;
  against: string;
  grossChange: Fils;
  netChange: Fils;
  headcountChange: number;
  drivers: VarianceDriver[];
  /** "+AED 12,000.00 gross (+0.5%), +1 person". */
  summaryText: string;
}

const DRIVER_LABEL: Record<DriverKey, string> = { "new-joiner":
  "New joiner (part month)", leaver: "Leaver (part month)",
"unpaid-leave": "Unpaid leave", overtime: "Overtime",
"back-pay": "Back pay", "salary-raise": "Salary raise",
"sick-leave": "Sick leave (unpaid in probation)", other: "Other changes" };

function driverOf(e: DemoEmployee, months: string[]): DriverKey {
  const has = (t: DemoEmployee["cases"][number]) => e.cases.includes(t);
  if (has("leaver")) return "leaver";
  if (has("unpaid-leave")) return "unpaid-leave";
  if (has("overtime") || has("night-overtime")) return "overtime";
  const sick = HISTORY_SICK.some(([id, from]) => id === e.id &&
    months.includes(from.slice(0, 7)));
  return sick ? "sick-leave" : "other";
}

/**
 * Splits the change in gross between two months by person and cause.
 * The causes come from the demo's own cases, so the parts add up to
 * the whole exactly (a test holds that).
 */
export function varianceBetween(c: DemoCompany, month: string,
  against: string): Variance {
  const h = payrollHistory(c);
  const find = (k: string) => {
    const m = h.find((x) => x.month === k);
    if (m === undefined) throw new Error(`no history for ${k}`);
    return m;
  };
  const now = find(month);
  const base = find(against);
  const before = new Map(base.lines.map((l) => [l.employeeId, l]));
  const parts = new Map<DriverKey, { amount: bigint; people: string[] }>();
  const add = (key: DriverKey, id: string, amount: bigint) => {
    if (amount === 0n) return;
    const p = parts.get(key) ?? { amount: 0n, people: [] };
    parts.set(key, { amount: p.amount + amount,
      people: p.people.includes(id) ? p.people : [...p.people, id] });
  };
  for (const l of now.lines) {
    const old = before.get(l.employeeId);
    const e = employeeById(c, l.employeeId);
    if (old === undefined) { add("new-joiner", l.employeeId, l.gross);
      continue; }
    const rest = l.gross - old.gross - l.backPay;
    add("back-pay", l.employeeId, l.backPay);
    if (e.cases.includes("back-pay") && l.backPay > 0n) {
      add("salary-raise", l.employeeId, rest);
    } else add(driverOf(e, [month, against]), l.employeeId,
      rest);
  }
  const names = (ids: string[]) => ids.map((id) => nameOf(c, id))
    .join(", ");
  const drivers = [...parts.entries()].map(([key, p]): VarianceDriver =>
    ({ key, label: DRIVER_LABEL[key], amount: fils(p.amount),
      people: p.people, text: `${DRIVER_LABEL[key]}: ${names(p.people)}, ` +
        signed(p.amount) }))
    .sort((a, b) => Number(abs(b.amount) - abs(a.amount)) ||
      a.key.localeCompare(b.key));
  const grossChange = fils(now.gross - base.gross);
  const head = now.headcount - base.headcount;
  return { title: `${reportMonth(month)} against ${reportMonth(against)}`,
    month, against, grossChange, netChange: fils(now.net - base.net),
    headcountChange: head, drivers, summaryText: `${signed(grossChange)} ` +
      `gross (${pct(grossChange, base.gross)}), ${head >= 0 ? "+" : "-"}` +
      `${Math.abs(head)} ${Math.abs(head) === 1 ? "person" : "people"}` };
}

const abs = (a: bigint): bigint => (a < 0n ? -a : a);
