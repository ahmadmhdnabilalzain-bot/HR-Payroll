/*
 * TEMP local stub with the shape of `@payroll/demo-data`. Delete this
 * file, stub-roster.ts and stub-issues.ts when the package lands, and
 * point load.ts at the package. Figures here are fictional and are
 * built by summing integer fils; components never type a figure.
 */
import { fils, type Fils } from "@payroll/engine";
import { stubApprovals, stubDocuments, stubIssues } from "./stub-issues";
import {
  DEPARTMENTS,
  ROLE_AR,
  ROSTER,
  TRANSPORT_AED,
  type DeptCode,
  type RosterRow,
} from "./stub-roster";
import type {
  DemoData,
  DepartmentRow,
  Employee,
  Payslip,
  PayslipLine,
} from "./types";

const AS_OF = "2026-11-23";
const aed = (n: number): Fils => fils(BigInt(n) * 100n);

/** One-off lines for the demo cases (fils), by employee id. */
const EXTRA: Record<string, PayslipLine> = {
  e10: { id: "backpay", kind: "earning", amountFils: aed(1200),
    label: { en: "Back pay, September", ar: "فرق راتب سبتمبر" } },
  e21: { id: "loan", kind: "deduction", amountFils: aed(1000),
    label: { en: "Loan instalment", ar: "قسط قرض" } },
};

function toEmployee(r: RosterRow): Employee {
  const [id, en, ar, dept, role, national] = r;
  return { id, name: { en, ar: ar ?? en }, department: DEPARTMENTS[dept],
    role: { en: role, ar: ROLE_AR[role] ?? role },
    nationality: national ? "AE" : "other" };
}

function linesOf(r: RosterRow): PayslipLine[] {
  const [id, , , , , , basic, housing] = r;
  const out: PayslipLine[] = [
    { id: "basic", kind: "earning", amountFils: aed(basic),
      label: { en: "Basic salary", ar: "الراتب الأساسي" } },
    { id: "housing", kind: "earning", amountFils: aed(housing),
      label: { en: "Housing allowance", ar: "بدل السكن" } },
    { id: "transport", kind: "earning", amountFils: aed(TRANSPORT_AED),
      label: { en: "Transport allowance", ar: "بدل المواصلات" } },
  ];
  const extra = EXTRA[id];
  if (extra !== undefined) out.push(extra);
  return out;
}

function netOf(lines: PayslipLine[]): Fils {
  return fils(lines.reduce((s, l) =>
    s + (l.kind === "earning" ? l.amountFils : -l.amountFils), 0n));
}

function grossOf(lines: PayslipLine[]): Fils {
  return fils(lines.reduce((s, l) =>
    s + (l.kind === "earning" ? l.amountFils : 0n), 0n));
}

function rowOf(id: string): RosterRow {
  const r = ROSTER.find((x) => x[0] === id);
  if (r === undefined) throw new Error(`STUB_NO_EMPLOYEE: ${id}`);
  return r;
}

function daysUntil(iso: string): number {
  const day = (s: string): number => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86400000;
  };
  return day(iso) - day(AS_OF);
}

function departments(): DepartmentRow[] {
  const codes = Object.keys(DEPARTMENTS) as DeptCode[];
  return codes.map((code) => {
    const rows = ROSTER.filter((r) => r[3] === code);
    const cost = rows.reduce((s, r) => s + grossOf(linesOf(r)), 0n);
    return { name: DEPARTMENTS[code], headcount: rows.length,
      costFils: fils(cost) };
  });
}

function payslip(employeeId: string): Payslip {
  const r = rowOf(employeeId);
  const lines = linesOf(r);
  return { employee: toEmployee(r), lines, netFils: netOf(lines),
    trace: lines.map((l) => `stub:${l.id}`) };
}

const nationals = ROSTER.filter((r) => r[5]).length;
const sum = (f: (l: PayslipLine[]) => Fils): Fils =>
  fils(ROSTER.reduce((s, r) => s + f(linesOf(r)), 0n));

export const stub: DemoData = {
  companyName: { en: "Demo Bank", ar: "البنك التجريبي" },
  headline: () => ({ runMonth: "2026-11", netTotalFils: sum(netOf),
    grossTotalFils: sum(grossOf), employerCostFils: sum(grossOf),
    headcount: ROSTER.length, issuesOpen: stubIssues(nationals).length,
    approvalsPending: stubApprovals().length }),
  departments,
  issues: () => stubIssues(nationals),
  payslip,
  explain: (employeeId, lineId) => {
    const line = payslip(employeeId).lines.find((l) => l.id === lineId);
    if (line === undefined) throw new Error(`STUB_NO_LINE: ${lineId}`);
    return { inputs: [], ruleId: `stub:${lineId}`, steps: [],
      resultFils: line.amountFils, sourceStatus: { en: "Sample value " +
        "(stub)", ar: "قيمة تجريبية" } };
  },
  leaveRequests: () => [],
  approvalsInbox: stubApprovals,
  sifSummary: () => ({ recordCount: ROSTER.length - 1,
    totalFils: fils(sum(netOf) - payslip("e20").netFils), findings: [] }),
  employee: (id) => toEmployee(rowOf(id)),
  employees: () => ROSTER.map(toEmployee),
  documents: () => stubDocuments(daysUntil),
  payCalendar: () => ({ asOf: AS_OF, cutOff: "2026-11-20",
    approveBy: "2026-11-24", sifDue: "2026-11-25",
    payday: "2026-11-26" }),
  basis: () => ({
    ruleSet: { en: "UAE mainland rules", ar: "قواعد البر الرئيسي في " +
      "الإمارات" },
    pension: { en: `Pension for ${nationals} UAE nationals: not ` +
      "computed; which Abu Dhabi pension fund rules apply is still open",
    ar: `معاش ${nationals} من المواطنين: غير محسوب؛ لم يُحسم بعد أي ` +
      "قواعد صندوق التقاعد في أبوظبي تنطبق" },
    engine: { en: "Sums of payslip lines in whole fils; no rounding " +
      "of totals", ar: "مجاميع بنود القسائم بالفلس الصحيح؛ دون تقريب " +
      "للمجاميع" },
  }),
};
