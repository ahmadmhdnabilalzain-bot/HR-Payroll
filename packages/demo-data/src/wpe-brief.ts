import { fils, type Fils } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import { employerCostView, gratuityProvision } from "./wpd-cost";
import { DEDUCTION_CAP_NOTE } from "./issues";
import { loans } from "./pay";
import { payCalendar } from "./summaries";
import type { DemoCompany } from "./types";
import { headlineTotals } from "./selectors";
import {
  accessApiKeys,
  accessReview,
  accessSettings,
  accessUsers,
  accessWebhooks,
  importSample,
} from "./wp9";
import { auditEvents, payrollHistory, verifyAuditChain } from "./wp7";
import { departmentText, shortDateText } from "./wp3";

/**
 * WPE reports for owners and IT: the weekly owner brief (X25), the
 * board pack (X26), the loans report (X11) and the IT dashboard (X24).
 * FICTIONAL sample data. Every figure is read from a selector that
 * already exists (the October run, the history, the gratuity and cost
 * views, the loans, the access data); nothing is typed per person and
 * no figure here can differ from the screen it came from.
 */

const sum = (xs: readonly bigint[]): Fils =>
  fils(xs.reduce((n, x) => n + x, 0n));

/* ---------------------------------------------------------------- *
 * X25 Owner brief
 * ---------------------------------------------------------------- */

/** Rows the screen overlays with the live state of the demo. */
export type BriefLive = "issues-open" | "approvals-waiting" | null;

export interface BriefItem {
  id: string;
  area: "Pay" | "People" | "Time off" | "Documents" | "Access";
  item: string;
  /** Plain words about the item. */
  text: string;
  /** A money figure, when the item is one. */
  amount: Fils | null;
  /** A count, when the item is one. */
  count: number | null;
  /** What happens next, or who it waits for. */
  next: string;
  live: BriefLive;
}

export interface OwnerBrief {
  /** The demo day the brief is written on. */
  asOf: string;
  title: string;
  items: BriefItem[];
  dates: { label: string; text: string }[];
  note: string;
}

const nameOf = (c: DemoCompany, id: string): string =>
  c.employees.find((e) => e.id === id)?.fullName ?? id;

const monthOf = (iso: string): string => iso.slice(0, 7);

/** This week's pack: what needs a person, in the order owners ask. */
export function ownerBrief(c: DemoCompany): OwnerBrief {
  const h = headlineTotals(c);
  const cal = payCalendar(c);
  const runApproval = c.approvals.find((a) => a.kind === "pay-run");
  const checker = runApproval === undefined ? "the General manager"
    : nameOf(c, runApproval.checkerEmployeeId);
  const month = monthOf(AS_OF);
  const joined = c.employees.filter((e) => monthOf(e.joiningDate) === month);
  const left = c.employees.filter((e) => e.leavingDate !== null);
  const probation = c.employees.filter((e) => e.leavingDate === null &&
    e.probationEndDate !== null && e.probationEndDate > AS_OF);
  const pending = c.leaveRequests.filter((r) => r.status === "pending");
  const soon = c.documents.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const expired = c.documents.filter((d) => d.daysLeft < 0);
  const review = accessReview(c);
  const settle = c.payRun.settlements[0];
  const item = (i: Omit<BriefItem, "amount" | "count" | "live"> &
    Partial<Pick<BriefItem, "amount" | "count" | "live">>): BriefItem =>
    ({ amount: null, count: null, live: null, ...i });
  const items: BriefItem[] = [
    item({ id: "net", area: "Pay", item: "October net pay",
      text: `${plural(h.payslips, "payslip", "payslips")}, as the run ` +
        "stands today.", amount: h.net,
      next: `Waits for ${checker} to sign off.`,
      live: "approvals-waiting" }),
    item({ id: "held", area: "Pay", item: "Held out of the salary file",
      text: "Pay with no valid bank account is held, never part-paid.",
      amount: h.heldNet, next: "Enter the bank account to release it." }),
    item({ id: "issues", area: "Pay", item: "Problems to fix before sign-off",
      text: "Counted from the run's own checks.", count: h.issuesOpen,
      next: "Open the pay run to fix them.", live: "issues-open" }),
    ...(settle === undefined ? [] : [item({ id: "settlement", area: "Pay",
      item: "Final settlement, outside the run",
      text: `${nameOf(c, settle.employeeId)}: gratuity and unused leave.`,
      amount: settle.result.total,
      next: "Paid on its own, not in the salary file." })]),
    item({ id: "headcount", area: "People", item: "On the payroll",
      text: h.headcountText, count: h.payslips,
      next: "Nothing to do." }),
    item({ id: "joined", area: "People", item: "Joined this month",
      text: joined.length === 0 ? "No one joined this month."
        : joined.map((e) => e.fullName).join(", ") + ".",
      count: joined.length, next: joined.length === 0 ? "Nothing to do."
        : "Check the joining list is complete." }),
    item({ id: "left", area: "People", item: "Leaving or left",
      text: left.length === 0 ? "No one has left."
        : left.map((e) => `${e.fullName}, last day ` +
          shortDateText(e.leavingDate!)).join("; ") + ".",
      count: left.length, next: left.length === 0 ? "Nothing to do."
        : "The final settlement is due 14 days after the last day." }),
    item({ id: "probation", area: "People", item: "Still on probation",
      text: "People whose probation has not ended.",
      count: probation.length, next: "Decide each before its end date." }),
    item({ id: "leave", area: "Time off", item: "Leave requests waiting",
      text: "Asked for and not yet decided.", count: pending.length,
      next: pending.length === 0 ? "Nothing to do."
        : "Decide them in Time, Leave requests." }),
    item({ id: "docs-soon", area: "Documents",
      item: "Documents ending in 30 days",
      text: "Visas, Emirates IDs and passports.", count: soon.length,
      next: soon.length === 0 ? "Nothing to do."
        : "Start the renewals now." }),
    item({ id: "docs-out", area: "Documents", item: "Documents past expiry",
      text: "Already out of date.", count: expired.length,
      next: expired.length === 0 ? "Nothing to do."
        : "Renew them before the next pay run." }),
    item({ id: "review", area: "Access", item: "Last access review",
      text: review.text, next: "Repeat the review each quarter." }),
  ];
  return { asOf: AS_OF, title: `Week of ${shortDateText(AS_OF)}`,
  items, dates: cal.items.filter((x) => x.key !== "asOf").map((x) =>
    ({ label: x.label.replace("Approve by", "Sign off by"),
      text: `${x.date.display} (${x.basis})` })),
  note: "Worked out on 27 Oct 2026 from the records in this demo. " +
    "Figures that change as you work (sign-off, problems) follow the " +
    "screen. Pension for UAE nationals is not computed." };
}

/* ---------------------------------------------------------------- *
 * X26 Board pack
 * ---------------------------------------------------------------- */

export interface BoardRow {
  topic: string;
  measure: string;
  amount: Fils | null;
  /** A count or a short phrase, when the measure is not money. */
  text: string | null;
  note: string;
}

export interface BoardPack {
  period: string;
  /** The headline figure: gross pay, January to October. */
  ytdGross: Fils;
  rows: BoardRow[];
  note: string;
}

/** Period figures for a board: every row is another screen's figure. */
export function boardPack(c: DemoCompany): BoardPack {
  const h = headlineTotals(c);
  const hist = payrollHistory(c);
  const ytd = sum(hist.map((m) => m.gross));
  const prior = sum(hist.filter((m) => m.status === "paid")
    .map((m) => m.gross));
  const gp = gratuityProvision(c);
  const ec = employerCostView(c);
  const owing = sum(loans(c).filter((l) => l.status !== "closed")
    .map((l) => l.balance));
  const active = c.employees.filter((e) => e.leavingDate === null);
  const left = c.employees.filter((e) => e.leavingDate !== null);
  const topDept = [...c.departments].map((d) => ({ d, gross: sum(
    c.payRun.payslips.filter((s) => c.employees.find((e) =>
      e.id === s.employeeId)?.departmentId === d.id)
      .map((s) => s.payslip.gross)) }))
    .sort((a, b) => a.gross > b.gross ? -1 : 1)[0];
  const row = (r: Omit<BoardRow, "amount" | "text"> &
    Partial<Pick<BoardRow, "amount" | "text">>): BoardRow =>
    ({ amount: null, text: null, ...r });
  const rows: BoardRow[] = [
    row({ topic: "People", measure: "On the October payroll",
      text: String(h.payslips), note: h.headcountText }),
    row({ topic: "People", measure: "Active on 27 Oct 2026",
      text: String(active.length), note: `${plural(left.length, "person has",
        "people have")} left or is leaving in 2026.` }),
    row({ topic: "People", measure: "UAE nationals",
      text: String(h.uaeNationals), note: h.employerCostNote }),
    row({ topic: "Pay", measure: "Gross pay, January to October",
      amount: ytd, note: "October is the run waiting for sign-off." }),
    row({ topic: "Pay", measure: "Gross pay, January to September",
      amount: prior, note: "Months already paid." }),
    row({ topic: "Pay", measure: "October gross pay", amount: h.gross,
      note: "Before deductions." }),
    row({ topic: "Pay", measure: "October net pay", amount: h.net,
      note: h.netNote }),
    ...(topDept === undefined ? [] : [row({ topic: "Pay",
      measure: "Largest department by gross pay",
      amount: topDept.gross, note: departmentText(topDept.d.id) })]),
    row({ topic: "Cost", measure: "Gross plus employer cost we can work out",
      amount: ec.partialTotal, note: "Partial: " +
        `${plural(ec.notComputedCount, "UAE national has",
          "UAE nationals have")} no employer pension figure.` }),
    row({ topic: "Liabilities", measure: "Gratuity, if all counted people " +
      "left today", amount: gp.total, note: gp.display.counts + "." }),
    row({ topic: "Liabilities", measure: "Loans and advances outstanding",
      amount: owing, note: "Active loans and advances agreed." }),
    row({ topic: "Open items", measure: "Problems before sign-off",
      text: String(h.issuesOpen), note: "Counted from the run's checks." }),
  ];
  return { period: "January to October 2026", ytdGross: ytd, rows,
    note: "Every row repeats a figure from its own report. The gratuity " +
      "figure is an estimate, not a booked amount." };
}

/* ---------------------------------------------------------------- *
 * X11 Loans report
 * ---------------------------------------------------------------- */

export interface LoanReportRow {
  ref: string;
  name: string;
  kind: "Loan" | "Advance";
  statusText: string;
  principal: Fils;
  instalment: Fils;
  balance: Fils;
  starts: string;
}

export interface LoansReport {
  rows: LoanReportRow[];
  outstanding: Fils;
  active: number;
  repaid: number;
  note: string;
}

const LOAN_STATUS: Record<string, string> = { active: "Active",
  closed: "Repaid", approved: "Agreed" };

/** All loans and advances, with what is still owed. */
export function loansReport(c: DemoCompany): LoansReport {
  const all = loans(c);
  const rows = all.map((l): LoanReportRow => ({ ref: l.ref,
    name: l.display.name, kind: l.kind === "loan" ? "Loan" : "Advance",
    statusText: LOAN_STATUS[l.status] ?? l.status,
    principal: l.principal, instalment: l.instalment, balance: l.balance,
    starts: l.display.firstDeduction }));
  return { rows, outstanding: sum(all.filter((l) => l.status !== "closed")
    .map((l) => l.balance)),
  active: all.filter((l) => l.status === "active").length,
  repaid: all.filter((l) => l.status === "closed").length,
  note: `${DEDUCTION_CAP_NOTE} A loan repaid in full shows no balance. ` +
    "An agreed advance starts in November." };
}

/* ---------------------------------------------------------------- *
 * X24 IT dashboard
 * ---------------------------------------------------------------- */

export interface ItRow {
  id: string;
  area: "Access" | "Connections" | "Data" | "Audit";
  measure: string;
  text: string;
  state: "ok" | "check";
  stateText: "OK" | "Check";
  /** Where it opens: a registry area id. */
  openId: string;
}

export interface ItDashboard {
  rows: ItRow[];
  checks: number;
  note: string;
}

/** Access, connections, import and the audit chain, in one table. */
export function itDashboard(c: DemoCompany): ItDashboard {
  const users = accessUsers(c);
  const noStep = users.filter((u) => !u.mfa);
  const keys = accessApiKeys(c);
  const hooks = accessWebhooks(c);
  const failing = hooks.filter((x) => x.status === "failing");
  const imp = importSample(c);
  const chain = verifyAuditChain(auditEvents(c));
  const set = accessSettings(c);
  const calls = keys.reduce((n, k) => n + k.callsLast30Days, 0);
  const r = (id: string, area: ItRow["area"], measure: string,
    text: string, ok: boolean, openId: string): ItRow => ({ id, area,
    measure, text, state: ok ? "ok" : "check",
    stateText: ok ? "OK" : "Check", openId });
  const rows: ItRow[] = [
    r("users", "Access", "People with more than the Employee role",
      `${users.length} users. ${set.mfaText}`, noStep.length === 0,
      "setup.users"),
    r("nostep", "Access", "Users without the second sign-in step",
      noStep.length === 0 ? "None."
        : noStep.map((u) => nameOf(c, u.employeeId)).join(", ") + ".",
      noStep.length === 0, "setup.signin"),
    r("review", "Access", "Access review", accessReview(c).text, true,
      "setup.review"),
    r("keys", "Connections", "API keys",
      `${plural(keys.length, "key", "keys")}, read-only, ` +
      `${plural(calls, "call", "calls")} in the last 30 days.`, true,
      "setup.keys"),
    r("hooks", "Connections", "Webhooks", failing.length === 0
      ? `${plural(hooks.length, "webhook", "webhooks")}, all working.`
      : `${failing.map((x) => x.name).join(", ")}: last delivery did ` +
        "not go through.", failing.length === 0, "setup.hooks"),
    r("import", "Data", "Import sample", imp.summaryText,
      imp.summary.errors === 0, "setup.import"),
    r("chain", "Audit", "Audit trail chain",
      chain.ok ? `${plural(chain.checked, "entry", "entries")} checked, ` +
        "none changed since they were written."
        : `Entry ${chain.brokenAt} does not match the one before it.`,
      chain.ok, "reports.audit"),
  ];
  return { rows, checks: rows.filter((x) => x.state === "check").length,
    note: "Worked out from this demo's own access data. Nothing here " +
      "says a security standard is met." };
}
