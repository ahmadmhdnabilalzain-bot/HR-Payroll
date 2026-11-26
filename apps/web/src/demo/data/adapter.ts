import {
  applyIbanFix,
  approvalsInbox,
  buildDemoCompany,
  costByDepartment,
  DEMO_AR_REVIEWED,
  DEMO_LABELS,
  documents,
  employeeById,
  fakeIban,
  headline,
  isDemoLabelKey,
  issuesOf,
  payCalendar,
  PENSION_NOT_COMPUTED,
  sifSummary,
  type DemoCompany,
  type DemoIssue,
} from "@payroll/demo-data";
import { adaptFiles } from "./files";
import { adaptFinish } from "./finish";
import { adaptPapers } from "./papers";
import { adaptMore } from "./more";
import { adaptVerify } from "./verify";
import { adaptMoves } from "./moves";
import { adaptHome } from "./home";
import { adaptPeople } from "./people";
import { adaptSafety } from "./safety";
import { adaptRequests } from "./requests";
import { adaptTalent } from "./talent";
import { adaptTeam } from "./team";
import type {
  Approval,
  DemoData,
  DemoSource,
  Employee,
  Issue,
  Localized,
} from "./types";

/** A package label in both languages; unknown keys fail loudly. */
function label(key: string): Localized {
  if (!isDemoLabelKey(key)) throw new Error(`DEMO_NO_LABEL: ${key}`);
  return { en: DEMO_LABELS.en[key], ar: DEMO_LABELS.ar[key] };
}

/** English stands in where the package has no Arabic yet. */
const both = (en: string, ar = ""): Localized =>
  ({ en, ar: ar === "" ? en : ar });

function toIssue(x: DemoIssue, n: number): Issue {
  return { id: `${x.code}:${x.subjectId ?? x.employeeId ?? n}`,
    code: x.code, kind: x.kind, severity: x.severity,
    employeeId: x.employeeId, subjectId: x.subjectId, fixKind: x.fixKind,
    title: both(x.title), reason: both(x.plainReason.en, x.plainReason.ar),
    suggestedFix: both(x.suggestedFix.en, x.suggestedFix.ar) };
}

function toEmployee(c: DemoCompany, id: string): Employee {
  const e = employeeById(c, id);
  const dept = c.departments.find((d) => d.id === e.departmentId);
  return { id, name: { en: e.fullName, ar: e.fullNameAr ?? e.fullName },
    department: dept === undefined ? both("") : label(dept.labelKey),
    role: label(`job.${e.jobKey}`) };
}

function payRunApproval(c: DemoCompany) {
  const a = c.approvals.find((x) => x.kind === "pay-run");
  if (a === undefined) throw new Error("DEMO_NO_PAY_RUN_APPROVAL");
  return a;
}

/** The screens' view of one state of the demo company. */
export function adapt(c: DemoCompany): DemoData {
  const issues = issuesOf(c).map(toIssue);
  const approvals: Approval[] = approvalsInbox(c).map((a) => ({ id: a.id,
    kind: a.kind, employeeId: a.employeeId, title: label(a.titleKey),
    requestedOn: a.requestedOn, amountFils: a.amount,
    makerId: a.makerEmployeeId, checkerId: a.checkerEmployeeId }));
  const h = headline(c);
  const run = payRunApproval(c);
  return {
    companyName: { en: c.company.name, ar: c.company.nameAr },
    arReviewed: DEMO_AR_REVIEWED,
    headline: () => ({
      runMonth: `${c.payRun.year}-${String(c.payRun.month)
        .padStart(2, "0")}`,
      netTotalFils: h.net, netNote: both(h.netNote),
      grossTotalFils: h.gross,
      deductionsFils: h.deductions,
      employerCostFils: c.payRun.totals.employerCost,
      sifTotalFils: h.sifTotal, heldNetFils: h.heldNet,
      headcount: h.payslips, sifPeople: sifSummary(c).employees,
      issuesOpen: h.issuesOpen, needsConfirmation: h.needsConfirmation,
      approvalsPending: h.pendingApprovals }),
    departments: () => costByDepartment(c).map((d) => ({
      id: d.departmentId, name: label(d.labelKey),
      headcount: d.headcount, costFils: d.gross })),
    issues: () => issues,
    heldIds: () => c.payRun.payslips.filter((s) => !s.sif.included)
      .map((s) => s.employeeId),
    badIbanIds: () => [...new Set(issues.filter((i) =>
      i.code === "IBAN_CHECKSUM" && i.employeeId !== null)
      .map((i) => i.employeeId ?? ""))],
    approvalsInbox: () => approvals,
    employee: (id) => toEmployee(c, id),
    employees: () => c.employees.map((e) => toEmployee(c, e.id)),
    documents: () => documents(c).map((d) => ({ ...d,
      kind: label(`doc.${d.kind}`) })),
    payCalendar: () => {
      const p = payCalendar(c);
      return { asOf: p.asOf, cutOff: p.cutOff, approveBy: p.approveBy,
        sifDue: p.salaryFileSent, payday: p.payday };
    },
    basis: () => ({ ruleSet: label("scope.rules"),
      pension: both(PENSION_NOT_COMPUTED.en, PENSION_NOT_COMPUTED.ar) }),
    runPeople: () => ({ makerId: run.makerEmployeeId,
      checkerId: run.checkerEmployeeId }),
    people: adaptPeople(c),
    papers: adaptPapers(c),
    team: adaptTeam(c),
    talent: adaptTalent(c),
    safety: adaptSafety(c),
    requests: adaptRequests(c),
    moves: adaptMoves(c),
    files: adaptFiles(c),
    home: adaptHome(c),
    more: adaptMore(c),
    verify: adaptVerify(c),
    finish: adaptFinish(c),
  };
}

/** The company after the IBANs entered, each through applyIbanFix. */
export function withIbans(base: DemoCompany,
  ibans: Readonly<Record<string, string>>): DemoCompany {
  return Object.entries(ibans).reduce((c, [id, iban]) => {
    const r = applyIbanFix(c, id, iban);
    return r.ok ? r.demo : c;
  }, base);
}

export function buildDemoSource(): DemoSource {
  const base = buildDemoCompany();
  const cache = new Map<string, DemoData>();
  return {
    at: (ibans) => {
      const key = JSON.stringify(Object.entries(ibans).sort());
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const view = adapt(withIbans(base, ibans));
      cache.set(key, view);
      return view;
    },
    tryIban: (ibans, employeeId, iban) => {
      const r = applyIbanFix(withIbans(base, ibans), employeeId, iban);
      return r.ok ? { ok: true } : { ok: false, reason: both(r.reason) };
    },
    bankLetterIban: (employeeId) =>
      fakeIban(Number(employeeId.replace(/\D/g, ""))).value,
  };
}

/** One state for tests and tools: the company as built. */
export function buildDemoData(): DemoData {
  return adapt(buildDemoCompany());
}
