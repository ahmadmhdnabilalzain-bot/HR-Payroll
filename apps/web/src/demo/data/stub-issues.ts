/*
 * TEMP: issues, approvals and documents for the local stub. Delete
 * with stub.ts when `@payroll/demo-data` lands. Arabic NEEDS NATIVE
 * REVIEW.
 */
import { fils } from "@payroll/engine";
import type { Approval, DocumentExpiry, Issue, Localized } from "./types";

export function stubIssues(nationals: number): Issue[] {
  return [
    { id: "i1", employeeId: "e20", kind: "missing-iban", severity: "error",
      plainReason: { en: "Rania Aboud joined on 2 November and has no " +
        "IBAN on file, so her salary cannot go into the salary file.",
      ar: "انضمت رانيا عبود في 2 نوفمبر ولا يوجد لها رقم آيبان، لذلك " +
        "لا يمكن إدراج راتبها في ملف الرواتب." },
      suggestedFix: { en: "Enter the IBAN from her bank letter.",
        ar: "أدخل رقم الآيبان من خطاب البنك الخاص بها." } },
    { id: "i2", employeeId: "e23", kind: "unpaid-leave",
      severity: "warning",
      plainReason: { en: "Ahmed Saleh took unpaid leave on 10 and 11 " +
        "November. The days are recorded but not yet deducted.",
      ar: "أخذ أحمد صالح إجازة غير مدفوعة يومي 10 و11 نوفمبر. الأيام " +
        "مسجلة ولم تُخصم بعد." },
      suggestedFix: { en: "Confirm the two days so the deduction is " +
        "applied to this run.", ar: "أكّد اليومين ليُطبَّق الخصم على " +
        "هذه الدورة." } },
    { id: "i3", employeeId: "e11", kind: "overtime-limit",
      severity: "warning",
      plainReason: { en: "Omar Siddiqui logged overtime above the daily " +
        "limit on 12 November.", ar: "سجّل عمر صديقي ساعات إضافية تتجاوز " +
        "الحد اليومي في 12 نوفمبر." },
      suggestedFix: { en: "Check the timesheet with his manager, then " +
        "accept the hours or pay up to the limit.", ar: "راجع سجل " +
        "الدوام مع مديره، ثم اقبل الساعات أو ادفع حتى الحد." } },
    { id: "i4", employeeId: "e10", kind: "salary-change",
      severity: "warning",
      plainReason: { en: "Karim Mansour's net pay is well above October " +
        "because September back pay is included this month.",
      ar: "صافي راتب كريم منصور أعلى بكثير من أكتوبر لأن فرق راتب " +
        "سبتمبر مُدرج هذا الشهر." },
      suggestedFix: { en: "Confirm the back pay is expected.",
        ar: "أكّد أن فرق الراتب متوقع." } },
    { id: "i5", employeeId: "e19", kind: "document-expiring",
      severity: "warning",
      plainReason: { en: "Joseph Mathew's residence visa expires on " +
        "2 December.", ar: "تنتهي إقامة جوزيف ماثيو في 2 ديسمبر." },
      suggestedFix: { en: "Start the renewal with the PRO.",
        ar: "ابدأ التجديد مع مندوب العلاقات الحكومية." } },
    { id: "i6", employeeId: "e27", kind: "pension-not-computed",
      severity: "info",
      plainReason: pensionReason(nationals),
      suggestedFix: { en: "Nothing to do now. Pension lines show as not " +
        "computed until the fund question is settled.", ar: "لا إجراء " +
        "الآن. تظهر بنود المعاش غير محسوبة حتى تُحسم مسألة الصندوق." } },
  ];
}

function pensionReason(n: number): Localized {
  return { en: `Pension contributions for ${n} UAE nationals are not ` +
    "computed: which Abu Dhabi pension fund rules apply is still open.",
  ar: `اشتراكات المعاش لـ ${n} من المواطنين غير محسوبة: لم يُحسم بعد ` +
    "أي قواعد صندوق التقاعد في أبوظبي تنطبق." };
}

export function stubApprovals(): Approval[] {
  return [
    { id: "a1", kind: "leave", employeeId: "e05", requestedOn:
      "2026-11-21", amountFils: null, title: { en: "Annual leave, " +
      "14 to 18 December", ar: "إجازة سنوية، من 14 إلى 18 ديسمبر" } },
    { id: "a2", kind: "expense", employeeId: "e04", requestedOn:
      "2026-11-20", amountFils: fils(48500n), title: { en: "Client " +
      "visit, taxi and parking", ar: "زيارة عميل، سيارة أجرة ومواقف" } },
    { id: "a3", kind: "salary-change", employeeId: "e26", requestedOn:
      "2026-11-19", amountFils: fils(150000n), title: { en: "Salary " +
      "increase after review", ar: "زيادة راتب بعد التقييم" } },
    { id: "a4", kind: "leave", employeeId: "e30", requestedOn:
      "2026-11-22", amountFils: null, title: { en: "Sick leave, " +
      "23 November", ar: "إجازة مرضية، 23 نوفمبر" } },
  ];
}

const DOC_KIND = {
  visa: { en: "Residence visa", ar: "الإقامة" },
  passport: { en: "Passport", ar: "جواز السفر" },
  eid: { en: "Emirates ID", ar: "الهوية الإماراتية" },
  labour: { en: "Labour card", ar: "بطاقة العمل" },
};

export function stubDocuments(daysUntil: (iso: string) => number)
  : DocumentExpiry[] {
  const rows: [string, string, keyof typeof DOC_KIND, string][] = [
    ["d1", "e19", "visa", "2026-12-02"],
    ["d2", "e16", "passport", "2026-12-14"],
    ["d3", "e07", "eid", "2026-12-27"],
    ["d4", "e21", "labour", "2027-01-19"],
  ];
  return rows.map(([id, employeeId, kind, expiresOn]) => ({ id,
    employeeId, kind: DOC_KIND[kind], expiresOn,
    daysLeft: daysUntil(expiresOn) }));
}
