import {
  approvalsInbox,
  buildDemoCompany,
  costByDepartment,
  DEMO_AR_REVIEWED,
  DEMO_LABELS,
  documents,
  employeeById,
  headline,
  isDemoLabelKey,
  issuesOf,
  payCalendar,
  PENSION_NOT_COMPUTED,
  type DemoCompany,
  type DemoIssue,
} from "@payroll/demo-data";
import type {
  Approval,
  DemoData,
  Employee,
  Issue,
  Localized,
} from "./types";

/** A package label in both languages; unknown keys fail loudly. */
function label(key: string): Localized {
  if (!isDemoLabelKey(key)) throw new Error(`DEMO_NO_LABEL: ${key}`);
  return { en: DEMO_LABELS.en[key], ar: DEMO_LABELS.ar[key] };
}

function toIssue(x: DemoIssue, n: number): Issue {
  return { id: `${x.code}:${x.subjectId ?? x.employeeId ?? n}`,
    code: x.code, employeeId: x.employeeId, severity: x.severity,
    fixKind: x.fixKind, count: x.count, plainReason: x.plainReason,
    suggestedFix: x.suggestedFix };
}

function toEmployee(c: DemoCompany, id: string): Employee {
  const e = employeeById(c, id);
  const dept = c.departments.find((d) => d.id === e.departmentId);
  return { id, name: { en: e.fullName, ar: e.fullNameAr ?? e.fullName },
    department: dept === undefined ? { en: "", ar: "" }
      : label(dept.labelKey),
    role: label(`job.${e.jobKey}`) };
}

function payRunApproval(c: DemoCompany) {
  const a = c.approvals.find((x) => x.kind === "pay-run");
  if (a === undefined) throw new Error("DEMO_NO_PAY_RUN_APPROVAL");
  return a;
}

/** The screens' view of one built demo company. */
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
      netTotalFils: h.net, grossTotalFils: h.gross,
      deductionsFils: h.deductions, employerCostFils:
        c.payRun.totals.employerCost, sifTotalFils: h.sifTotal,
      heldNetFils: h.heldNet, headcount: h.payslips,
      issuesOpen: h.issues, needsConfirmation: h.needsConfirmation,
      approvalsPending: h.pendingApprovals }),
    departments: () => costByDepartment(c).map((d) => ({
      id: d.departmentId, name: label(d.labelKey),
      headcount: d.headcount, costFils: d.gross })),
    issues: () => issues,
    approvalsInbox: () => approvals,
    employee: (id) => toEmployee(c, id),
    documents: () => documents(c).map((d) => ({ ...d,
      kind: label(`doc.${d.kind}`) })),
    payCalendar: () => {
      const p = payCalendar(c);
      return { asOf: p.asOf, cutOff: p.cutOff, approveBy: p.approveBy,
        sifDue: p.sifDue, payday: p.payday };
    },
    basis: () => ({ ruleSet: label("scope.rules"),
      pension: { en: PENSION_NOT_COMPUTED.en,
        ar: PENSION_NOT_COMPUTED.ar } }),
    runPeople: () => ({ makerId: run.makerEmployeeId,
      checkerId: run.checkerEmployeeId }),
  };
}

export function buildDemoData(): DemoData {
  return adapt(buildDemoCompany());
}
