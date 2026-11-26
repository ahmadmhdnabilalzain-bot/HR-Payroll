import { formatAed } from "@payroll/engine";
import { PENSION_NOT_COMPUTED } from "./pension";
import type { DemoCompany } from "./types";

export type IssueSeverity = "error" | "warning" | "info" |
  "needs-confirmation";

/** Who raised it: never text we made up about the data. */
export type IssueSource = "engine" | "sif-validator" | "sif-batch" |
  "documents" | "demo-scope";

/** What the UI may offer: a real next step, never a one-click vanish. */
export type FixKind = "enter-iban" | "review" | "renew-document" |
  "confirm-pension";

/** English is ours; the Arabic is NEEDS NATIVE REVIEW. */
export interface Bilingual { en: string; ar: string }

/** One thing to look at before approving, why, and what to do. */
export interface DemoIssue {
  code: string;
  severity: IssueSeverity;
  source: IssueSource;
  employeeId: string | null;
  subjectId: string | null;
  count: number;
  plainReason: Bilingual;
  suggestedFix: Bilingual;
  fixKind: FixKind;
  /** The engine's or validator's own words, when it raised it. */
  raisedAs: string | null;
}

interface Fix { fix: Bilingual; kind: FixKind }

/** Suggested fixes, by issue code (Arabic NEEDS NATIVE REVIEW). */
const FIX: Record<string, Fix> = {
  SIF_HELD_NO_IBAN: { kind: "enter-iban", fix: { en: "Enter the IBAN " +
    "from a bank letter, then regenerate the SIF.", ar: "أدخل رقم " +
    "الآيبان من خطاب البنك ثم أعد إنشاء ملف حماية الأجور." } },
  IBAN_CHECKSUM: { kind: "enter-iban", fix: { en: "Ask the employee " +
    "for a bank letter and correct the IBAN before sending the file.",
  ar: "اطلب خطاب البنك من الموظف وصحح رقم الآيبان قبل إرسال الملف." } },
  ROUTING_UNKNOWN: { kind: "review", fix: { en: "Confirm the routing " +
    "code with the paying bank; the bundled table is partial.",
  ar: "أكد رمز التوجيه مع البنك الدافع؛ الجدول المرفق غير مكتمل." } },
  OVERTIME_DAILY_CAP_EXCEEDED: { kind: "review", fix: { en: "Check the " +
    "overtime was agreed, and plan cover so no one works more than 2 " +
    "extra hours a day.", ar: "تحقق من الموافقة على العمل الإضافي " +
    "ونظّم البدلاء حتى لا يتجاوز أحد ساعتين إضافيتين يوميًا." } },
  DEDUCTION_DEFERRED: { kind: "review", fix: { en: "Agree a smaller " +
    "instalment with the employee; the engine carried the rest to next " +
    "month.", ar: "اتفق مع الموظف على قسط أصغر؛ نقل المحرك الباقي إلى " +
    "الشهر التالي." } },
  SICK_UNPAID_PROBATION: { kind: "review", fix: { en: "Tell the " +
    "employee before payday that the sick day is unpaid.", ar: "أبلغ " +
    "الموظف قبل يوم الصرف بأن اليوم المرضي بدون أجر." } },
  DOCUMENT_EXPIRING: { kind: "renew-document", fix: { en: "Start the " +
    "renewal now with the PRO, before the expiry date.", ar: "ابدأ " +
    "التجديد الآن مع مندوب العلاقات الحكومية قبل تاريخ الانتهاء." } },
  PENSION_NOT_COMPUTED: { kind: "confirm-pension", fix: { en: "Confirm " +
    "the fund and rate with the pension fund, then add the pension " +
    "lines before approving.", ar: "أكد الصندوق والمعدل مع صندوق " +
    "المعاشات ثم أضف بنود المعاش قبل الاعتماد." } },
  SETTLEMENT_PARTIAL: { kind: "review", fix: { en: "Enter notice pay " +
    "and any deductions by hand before paying the settlement.",
  ar: "أدخل بدل الإنذار وأي خصومات يدويًا قبل صرف التسوية." } },
};
const GENERIC: Fix = { kind: "review", fix: { en: "Review before " +
  "approving.", ar: "راجع قبل الاعتماد." } };
const AR_GENERIC = "مشكلة تحتاج إلى مراجعة قبل الاعتماد.";

type Make = Pick<DemoIssue, "code" | "severity" | "source" |
  "employeeId" | "subjectId" | "plainReason"> &
  { count?: number; raisedAs?: string | null };

function issue(x: Make): DemoIssue {
  const f = FIX[x.code] ?? GENERIC;
  return { count: 1, raisedAs: null, ...x, suggestedFix: f.fix,
    fixKind: f.kind };
}

function engineFlags(c: DemoCompany): DemoIssue[] {
  // A deferral is listed by deferred() with its amounts.
  return c.payRun.payslips.flatMap((s) => s.payslip.flags.filter((f) =>
    f.code !== "DEDUCTION_DEFERRED").map((f) => issue({ code: f.code,
    severity: "warning", source: "engine", employeeId: s.employeeId,
    subjectId: s.id, raisedAs: f.message,
    plainReason: { en: `${f.message}.`, ar: AR_GENERIC } })));
}

function deferred(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => s.payslip.deferred.map((d) =>
    issue({ code: "DEDUCTION_DEFERRED", severity: "warning",
      source: "engine", employeeId: s.employeeId, subjectId: d.ref,
      raisedAs: `${d.reason}: deferred ${d.deferred}`,
      plainReason: { en: `Deduction ${d.ref} asked ` +
        `${formatAed(d.requested)} but the legal cap (${d.reason}) ` +
        `allows ${formatAed(d.taken)}; ${formatAed(d.deferred)} is ` +
        "carried to next month.", ar: "الخصم أكبر من الحد القانوني؛ " +
        "نُقل الباقي إلى الشهر التالي." } })));
}

/** Sick days the engine left unpaid because of probation. */
function probationSick(c: DemoCompany): DemoIssue[] {
  return c.payRun.payslips.flatMap((s) => s.trace.filter((l) =>
    l.id === "leave.sick" && (l.inputs["probation"] ?? "0") !== "0")
    .map((l) => issue({ code: "SICK_UNPAID_PROBATION", severity: "info",
      source: "engine", employeeId: s.employeeId, subjectId: s.id,
      raisedAs: `${l.label}: ${l.inputs["probation"]} unpaid in ` +
        "probation", plainReason: { en: `${l.inputs["probation"]} sick ` +
        "day(s) in probation: unpaid (Decree-Law 33/2021 Art 31(2)).",
      ar: "أيام مرضية خلال فترة التجربة: بدون أجر." } })));
}

function sif(c: DemoCompany): DemoIssue[] {
  const held = c.payRun.payslips.flatMap((s) => s.sif.included ? []
    : [issue({ code: "SIF_HELD_NO_IBAN", severity: "error",
      source: "sif-batch", employeeId: s.employeeId, subjectId: s.id,
      plainReason: { en: `${s.sif.reason} Net pay ` +
        `${formatAed(s.payslip.net)} is held.`, ar: "لا يوجد رقم " +
        "آيبان: الراتب محجوز خارج ملف حماية الأجور." } })]);
  const byAccount = new Map(c.employees.flatMap((e) => e.iban === null
    ? [] : [[e.iban.value, e.id] as const]));
  const findings = c.sif.findings.map((f) => issue({ code: f.code,
    severity: f.severity, source: "sif-validator",
    employeeId: byAccount.get(f.value) ?? null,
    subjectId: `${c.sif.fileName}:${f.line}`, raisedAs: f.message,
    plainReason: { en: `SIF line ${f.line}: ${f.message}.`,
      ar: AR_GENERIC } }));
  return [...held, ...findings];
}

function scope(c: DemoCompany): DemoIssue[] {
  const nationals = c.payRun.payslips.filter((s) =>
    s.basis === "engine-steps-without-pension");
  return [issue({ code: PENSION_NOT_COMPUTED.code,
    severity: "needs-confirmation", source: "demo-scope", employeeId: null,
    subjectId: c.payRun.id, count: nationals.length,
    plainReason: { en: PENSION_NOT_COMPUTED.en,
      ar: PENSION_NOT_COMPUTED.ar } }),
  ...c.payRun.settlements.map((s) => issue({ code: "SETTLEMENT_PARTIAL",
    severity: "needs-confirmation", source: "engine",
    employeeId: s.employeeId, subjectId: null,
    raisedAs: s.result.notComputed.join(", "),
    plainReason: { en: "Final settlement: gratuity and leave pay are " +
      `computed; not computed: ${s.result.notComputed.join(", ")}.`,
    ar: "التسوية النهائية: بعض البنود غير محسوبة." } }))];
}

function documents(c: DemoCompany): DemoIssue[] {
  return c.documents.filter((d) => d.daysLeft <= 30).map((d) => issue({
    code: "DOCUMENT_EXPIRING", severity: "warning", source: "documents",
    employeeId: d.employeeId, subjectId: d.id, plainReason: {
      en: `${d.kind} expires on ${d.expiresOn} (${d.daysLeft} days).`,
      ar: "تنتهي صلاحية المستند قريبًا." } }));
}

/** Every issue, most serious first, in a stable order. */
export function issuesOf(c: DemoCompany): DemoIssue[] {
  const rank = { error: 0, warning: 1, "needs-confirmation": 2,
    info: 3 } as const;
  return [...sif(c), ...engineFlags(c), ...deferred(c),
    ...probationSick(c), ...documents(c), ...scope(c)]
    .map((x, i) => ({ x, i }))
    .sort((a, b) => rank[a.x.severity] - rank[b.x.severity] || a.i - b.i)
    .map(({ x }) => x);
}
