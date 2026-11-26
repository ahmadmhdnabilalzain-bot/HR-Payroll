import {
  boardPack,
  buildDemoCompany,
  costByDepartment,
  departmentText,
  employerCostView,
  gratuityProvision,
  headlineTotals,
  issuesOf,
  itDashboard,
  loans,
  loansReport,
  ownerBrief,
  payrollHistory,
  reportMonth,
  shortDateText,
  type BoardPack,
  type DemoCompany,
  type DemoEmployee,
  type ItDashboard,
  type LoansReport,
  type OwnerBrief,
} from "@payroll/demo-data";
import { fils } from "@payroll/engine";
import {
  COUNT_RULE,
  one,
  people,
  sumExplain,
  type Part,
} from "../../components/explain/sum";
import {
  count,
  money,
  type Explanation,
} from "../../components/explain/types";

/**
 * The owner brief, board pack, loans report and IT dashboard (a lazy
 * chunk). Everything is read from the package's selectors; this file
 * gathers them, and works out the sum behind each figure from the same
 * selectors the package used for it.
 */
export interface MoreSource {
  brief: OwnerBrief;
  board: BoardPack;
  loans: LoansReport;
  it: ItDashboard;
  /** The working behind a brief item's figure, by item id. */
  briefExplain: Readonly<Record<string, Explanation>>;
  /** The working behind each board row, in row order. */
  boardExplain: readonly (Explanation | undefined)[];
  boardTotal: Explanation;
  /** Still owed, and each loan's balance by reference. */
  loansExplain: Explanation;
  loanExplain: Readonly<Record<string, Explanation>>;
}

const RUN = "October payroll";

function counted(c: DemoCompany, id: string, title: string,
  summary: string, who: DemoEmployee[], words: (e: DemoEmployee) => string)
  : Explanation {
  return sumExplain({ id, title, subject: "Whole company", summary,
    resultLabel: "People", countText: people,
    parts: who.map((e) => one(words(e))), rules: [COUNT_RULE],
    scope: c.rulesScope });
}

function byDepartment(c: DemoCompany, f: (s: DemoCompany["payRun"][
  "payslips"][number]) => bigint): Part[] {
  const dept = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  return c.departments.map((d) => c.payRun.payslips.filter((s) =>
    dept.get(s.employeeId) === d.id)).filter((xs) => xs.length > 0)
    .map((xs) => ({ text: `${departmentText(dept.get(xs[0]!.employeeId)!)} ` +
      `(${people(xs.length)})`, value: money(fils(xs.reduce((n, s) =>
      n + f(s), 0n))) }));
}

function explains(c: DemoCompany, brief: OwnerBrief, board: BoardPack)
  : Pick<MoreSource, "briefExplain" | "boardExplain" | "boardTotal" |
    "loansExplain" | "loanExplain"> {
  const scope = c.rulesScope;
  const h = headlineTotals(c);
  const name = (id: string): string =>
    c.employees.find((e) => e.id === id)?.fullName ?? "";
  const hist = payrollHistory(c);
  const gross = sumExplain({ id: "more:gross", title: "October gross pay",
    subject: "Whole pay run", summary: "Every payslip's gross pay, added " +
      "up by department.", resultLabel: "Gross pay",
    parts: byDepartment(c, (s) => s.payslip.gross), scope });
  const net = sumExplain({ id: "more:net", title: "October net pay",
    subject: "Whole pay run", summary: "Gross pay less everything taken " +
      "from pay, payslip by payslip, exactly.", resultLabel: "Net pay",
    parts: [{ text: "Gross pay", value: money(h.gross) },
      { text: "Less deductions", value: money(h.deductions), less: true }],
    notComputed: ["Pension for UAE nationals is not computed."], scope });
  const held = c.payRun.payslips.filter((s) => !s.sif.included);
  const heldX = sumExplain({ id: "more:held", title: "Held out of the " +
    "salary file", subject: "Whole pay run", summary: "Net pay of the " +
    "people with no valid bank account when the brief was written. It " +
    "is held, never part-paid.", resultLabel: "Held out",
  parts: held.map((s) => ({ text: name(s.employeeId),
    value: money(s.payslip.net) })), scope });
  const payslips = sumExplain({ id: "more:payslips", title: "On the " +
    "October payroll", subject: "Whole pay run", summary: "One payslip " +
    "per person on the October run, counted by department.",
  resultLabel: "People", countText: people,
  parts: c.departments.map((d) => c.payRun.payslips.filter((s) =>
    c.employees.find((e) => e.id === s.employeeId)?.departmentId === d.id)
    .length).map((n, i) => ({ n, d: c.departments[i]! }))
    .filter((x) => x.n > 0).map((x) => ({ text: departmentText(x.d.id),
      value: count(x.n, people(x.n)) })), rules: [COUNT_RULE], scope });
  const month = brief.asOf.slice(0, 7);
  const settle = c.payRun.settlements[0];
  const briefExplain: Record<string, Explanation> = {
    net, held: heldX, headcount: payslips,
    joined: counted(c, "more:joined", "Joined this month", "Everyone " +
      "whose first day is in this month.", c.employees.filter((e) =>
      e.joiningDate.startsWith(month)), (e) => `${e.fullName}, joined ` +
      shortDateText(e.joiningDate)),
    left: counted(c, "more:left", "Leaving or left", "Everyone with a " +
      "last working day recorded.", c.employees.filter((e) =>
      e.leavingDate !== null), (e) => `${e.fullName}, last day ` +
      shortDateText(e.leavingDate!)),
    probation: counted(c, "more:probation", "Still on probation",
      "Everyone whose probation ends after the report date.",
      c.employees.filter((e) => e.leavingDate === null &&
        e.probationEndDate !== null && e.probationEndDate > brief.asOf),
      (e) => `${e.fullName}, ends ${shortDateText(e.probationEndDate!)}`),
    leave: sumExplain({ id: "more:leave", title: "Leave requests waiting",
      subject: "Time off", summary: "Each leave request asked for and " +
        "not yet decided when the brief was written.",
      resultLabel: "Requests", countText: (n) => `${n} ${n === 1
        ? "request" : "requests"}`, parts: c.leaveRequests.filter((r) =>
        r.status === "pending").map((r) => one(`${name(r.employeeId)}, ` +
        `${shortDateText(r.startDate)} to ${shortDateText(r.endDate)}`)),
      rules: [COUNT_RULE], scope }),
    "docs-soon": docs(c, "more:docs-soon", "Documents ending in 30 days",
      (d) => d.daysLeft >= 0 && d.daysLeft <= 30),
    "docs-out": docs(c, "more:docs-out", "Documents past expiry",
      (d) => d.daysLeft < 0),
  };
  if (settle !== undefined) {
    briefExplain["settlement"] = sumExplain({ id: "more:settlement",
      title: "Final settlement", subject: name(settle.employeeId),
      summary: "The gratuity and the unused leave pay the payroll worked " +
        "out. The gratuity's own working opens on the pay run.",
      resultLabel: "Worked out so far",
      parts: [{ text: "End-of-service gratuity",
        value: money(settle.result.gratuity) },
      { text: "Unused annual leave pay",
        value: money(settle.result.leavePay) }],
      notComputed: ["Notice pay, deductions and other dues are not " +
        "worked out here."], scope });
  }
  const gp = gratuityProvision(c);
  const ec = employerCostView(c);
  const open = loans(c).filter((l) => l.status !== "closed");
  const loansExplain = sumExplain({ id: "loans:outstanding",
    title: "Loans and advances outstanding", subject: "Whole company",
    summary: "The balance still owed on each loan and advance not yet " +
      "repaid, from the payslips.", resultLabel: "Still owed",
    parts: open.map((l) => ({ text: `${l.display.name}, ${l.ref}`,
      value: money(l.balance) })), scope });
  const loanExplain: Record<string, Explanation> = {};
  for (const l of loans(c)) {
    const taken = l.ledger.reduce((n, x) => n + x.taken, 0n);
    if (l.principal - taken !== l.balance) continue;
    loanExplain[l.ref] = sumExplain({ id: `loan-balance:${l.ref}`,
      title: "Balance still owed", subject: `${l.display.name}, ${l.ref}`,
      summary: "What was lent, less each instalment taken from pay.",
      resultLabel: "Balance",
      parts: [{ text: "Lent", value: money(l.principal) },
        ...l.ledger.filter((x) => x.taken > 0n).map((x) => ({
          text: `Taken in ${reportMonth(`2026-${String(x.month)
            .padStart(2, "0")}`)}`, value: money(x.taken), less: true }))],
      scope });
  }
  const top = [...costByDepartment(c)].sort((a, b) => a.gross > b.gross
    ? -1 : 1)[0];
  const topX = top === undefined ? undefined : sumExplain({
    id: "more:top-dept", title: "Largest department by gross pay",
    subject: departmentText(top.departmentId),
    summary: "October gross pay of everyone in the department.",
    resultLabel: "Gross pay", parts: c.payRun.payslips.filter((s) =>
      c.employees.find((e) => e.id === s.employeeId)?.departmentId ===
      top.departmentId).map((s) => ({ text: name(s.employeeId),
      value: money(s.payslip.gross) })), scope });
  const ytd = sumExplain({ id: "more:ytd", title: "Gross pay, January to " +
    "October", subject: "Whole company", summary: "Each month's gross " +
    "pay, added up. October is the run waiting for sign-off.",
  resultLabel: "Gross pay", parts: hist.map((m) => ({
    text: reportMonth(m.month), value: money(m.gross) })), scope });
  const prior = sumExplain({ id: "more:prior", title: "Gross pay, " +
    "January to September", subject: "Months already paid",
  summary: "Each paid month's gross pay, added up.",
  resultLabel: "Gross pay", parts: hist.filter((m) => m.status === "paid")
    .map((m) => ({ text: reportMonth(m.month), value: money(m.gross) })),
  scope });
  const active = c.employees.filter((e) => e.leavingDate === null);
  const byRow: Record<string, Explanation | undefined> = {
    "On the October payroll": payslips,
    [`Active on ${shortDateText(brief.asOf)}`]: counted(c, "more:active",
      "Active employees", "Everyone with no last working day recorded.",
      active, (e) => e.fullName),
    "UAE nationals": counted(c, "more:nationals", "UAE nationals",
      "Everyone employed on the report date who is a UAE national.",
      c.employees.filter((e) => e.nationality === "AE" &&
        e.joiningDate <= brief.asOf && (e.leavingDate === null ||
          e.leavingDate >= brief.asOf)), (e) => e.fullName),
    "Gross pay, January to October": ytd,
    "Gross pay, January to September": prior,
    "October gross pay": gross,
    "October net pay": net,
    "Largest department by gross pay": topX,
    "Gross plus employer cost we can work out": sumExplain({
      id: "more:employer", title: "Gross plus employer cost, partial",
      subject: ec.period, summary: "Gross pay plus the employer costs the " +
        "payroll works out. It is partial.", resultLabel: "Partial total",
      parts: [{ text: "Gross pay", value: money(ec.gross) },
        { text: "Employer cost worked out",
          value: money(ec.employerComputed) }],
      notComputed: ["UAE nationals' employer pension, ILOE, insurance " +
        "and other employer costs are not computed."], scope }),
    "Gratuity, if all counted people left today": sumExplain({
      id: "more:gratuity", title: "Gratuity provision",
      subject: "Whole company", summary: "Each department's gratuity " +
        "provision, added up. An estimate, not a booked amount.",
      resultLabel: "Provision", parts: gp.byDepartment
        .filter((d) => d.amount > 0n).map((d) => ({
          text: d.departmentText, value: money(d.amount) })), scope }),
    "Loans and advances outstanding": loansExplain,
    "Problems before sign-off": sumExplain({ id: "more:issues",
      title: "Problems before sign-off", subject: "October pay run",
      summary: "Each check on the run that must be fixed before sign-off, " +
        "counted once, as the run stood when the pack was written.",
      resultLabel: "Problems", countText: (n) => `${n} ${n === 1
        ? "problem" : "problems"}`, parts: issuesOf(c).filter((i) =>
        i.kind === "issue").map((i) => one(i.title)),
      rules: [COUNT_RULE], scope }),
  };
  return { briefExplain, boardExplain: board.rows.map((r) =>
    byRow[r.measure]), boardTotal: ytd, loansExplain, loanExplain };
}

function docs(c: DemoCompany, id: string, title: string,
  f: (d: DemoCompany["documents"][number]) => boolean): Explanation {
  const name = (eid: string): string =>
    c.employees.find((e) => e.id === eid)?.fullName ?? "";
  return sumExplain({ id, title, subject: "Visas, Emirates IDs and " +
    "passports", summary: "Each document in the window, counted once.",
  resultLabel: "Documents", countText: (n) => `${n} ${n === 1
    ? "document" : "documents"}`,
  parts: c.documents.filter(f).map((d) => one(`${name(d.employeeId)}, ` +
    `${d.daysLeft < 0 ? "ended" : "ends"} in ${Math.abs(d.daysLeft)} ` +
    "days")), rules: [COUNT_RULE],
  scope: c.rulesScope });
}

export function buildMoreSource(): MoreSource {
  const c = buildDemoCompany();
  const brief = ownerBrief(c);
  const board = boardPack(c);
  return { brief, board, loans: loansReport(c), it: itDashboard(c),
    ...explains(c, brief, board) };
}
