import type { DemoCompany } from "./types";

export type IssueSeverity = "error" | "warning" | "info";

/** One thing a person should look at, and why it is an issue. */
export interface DemoIssue {
  code: string;
  severity: IssueSeverity;
  employeeId: string | null;
  subjectId: string | null;
  count: number;
  /** English is ours; the Arabic is NEEDS NATIVE REVIEW. */
  reason: { en: string; ar: string };
}

type Make = Omit<DemoIssue, "count"> & { count?: number };
const issue = (x: Make): DemoIssue => ({ count: 1, ...x });

function missingIban(c: DemoCompany): DemoIssue[] {
  return c.employees.filter((e) => e.iban === null).map((e) => issue({
    code: "MISSING_IBAN", severity: "error", employeeId: e.id,
    subjectId: null, reason: { en: `No IBAN on file. ${e.fullName} ` +
      `joins on ${e.joiningDate}; that month's SIF cannot pay them ` +
      "until bank details are entered.", ar: "لا يوجد رقم آيبان. لا " +
      "يمكن صرف راتب هذا الموظف في ملف حماية الأجور حتى تُدخل " +
      "بياناته البنكية." } }));
}

/** SIF findings grouped by code; the report never says compliant. */
function sifFindings(c: DemoCompany): DemoIssue[] {
  const codes = [...new Set(c.sif.findings.map((f) => f.code))].sort();
  return codes.map((code) => {
    const fs = c.sif.findings.filter((f) => f.code === code);
    const fake = code === "IBAN_CHECKSUM" ? " Demo IBANs use check " +
      "digits 00 or 01 on purpose, so they can never be real " +
      "accounts." : "";
    return issue({ code: `SIF_${code}`, severity: fs[0]!.severity,
      employeeId: null, subjectId: c.sif.fileName, count: fs.length,
      reason: { en: `SIF check: ${fs[0]!.message} (${fs.length} ` +
        `lines).${fake}`, ar: `فحص ملف حماية الأجور: ${fs.length} سطر ` +
        "بحاجة إلى مراجعة." } });
  });
}

function payslipFlags(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => s.payslip.flags.map((f) =>
    issue({ code: f.code === "OVERRIDE_USED" ? "GPSSA_BASE_ASSUMED"
      : `PAYSLIP_${f.code}`, severity: f.code === "OVERRIDE_USED"
      ? "info" : "warning", employeeId: s.employeeId, subjectId: s.id,
    reason: { en: f.code === "OVERRIDE_USED" ? "GPSSA contribution base " +
      "is unsourced; this payslip uses the demo's assumption (basic " +
      "salary)." : `Engine flag: ${f.message}.`, ar: "تنبيه من محرك " +
      "الرواتب على هذه القسيمة." } })));
}

function documents(c: DemoCompany): DemoIssue[] {
  return c.documents.filter((d) => d.state === "expired" ||
    d.state === "expiring-30").map((d) => issue({
    code: d.state === "expired" ? "DOCUMENT_EXPIRED"
      : "DOCUMENT_EXPIRING", severity: d.state === "expired" ? "error"
      : "warning", employeeId: d.employeeId, subjectId: d.id,
    reason: d.state === "expired"
      ? { en: `${d.kind} expired on ${d.expiresOn}.`,
        ar: "انتهت صلاحية المستند." }
      : { en: `${d.kind} expires on ${d.expiresOn} (${d.daysLeft} days).`,
        ar: "تنتهي صلاحية المستند قريبًا." } }));
}

function people(c: DemoCompany): DemoIssue[] {
  const out = c.leaveRequests.filter((r) => r.status === "pending")
    .map((r) => issue({ code: "LEAVE_PENDING", severity: "info",
      employeeId: r.employeeId, subjectId: r.id, reason: { en: "Leave " +
        `from ${r.startDate} to ${r.endDate} waits for a decision.`,
      ar: "طلب إجازة بانتظار القرار." } }));
  for (const s of c.payRun.settlements) {
    out.push(issue({ code: "SETTLEMENT_PART_COMPUTED", severity:
      "warning", employeeId: s.employeeId, subjectId: null, reason: {
      en: "Final settlement: gratuity and leave pay are computed; not " +
        `computed: ${s.result.notComputed.join(", ")}.`,
      ar: "التسوية النهائية: بعض البنود غير محسوبة." } }));
  }
  return out;
}

function emiratisation(c: DemoCompany): DemoIssue[] {
  const r = c.emiratisation;
  const missing = [...r.missingParams, ...r.missingInputs];
  if (missing.length === 0) return [];
  return [issue({ code: "EMIRATISATION_NEEDS_INPUT", severity: "info",
    employeeId: null, subjectId: null, count: missing.length, reason: {
      en: `Emiratisation target cannot be stated: ${missing.join(", ")} ` +
        "has no sourced value.", ar: "لا يمكن تحديد نسبة التوطين " +
        "المطلوبة: قيم غير موثقة." } })];
}

/** Every issue in the demo, most serious first, stable order. */
export function issuesOf(c: DemoCompany): DemoIssue[] {
  const rank = { error: 0, warning: 1, info: 2 } as const;
  return [...missingIban(c), ...sifFindings(c), ...documents(c),
    ...payslipFlags(c), ...people(c), ...emiratisation(c)]
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rank[a.x.severity] - rank[b.x.severity] || a.i - b.i)
    .map(({ x }) => x);
}
