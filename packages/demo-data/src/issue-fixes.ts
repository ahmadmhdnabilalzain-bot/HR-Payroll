/** What the UI may offer: a real next step, never a one-click vanish. */
export type FixKind = "enter-iban" | "review" | "renew-document" |
  "confirm-pension";

/** English is ours; the Arabic is NEEDS NATIVE REVIEW. */
export interface Bilingual { en: string; ar: string }

export interface Fix { fix: Bilingual; kind: FixKind }

/** Suggested fixes by issue code (Arabic NEEDS NATIVE REVIEW). */
export const FIX: Record<string, Fix> = {
  SIF_HELD_NO_IBAN: { kind: "enter-iban", fix: { en: "Enter the IBAN " +
    "from the employee's bank letter. The pay then joins the salary " +
    "file.", ar: "أدخل رقم الآيبان من خطاب البنك ثم أعد إنشاء ملف " +
    "حماية الأجور." } },
  IBAN_CHECKSUM: { kind: "enter-iban", fix: { en: "Ask the employee " +
    "for a bank letter and correct the IBAN before the file is sent.",
  ar: "اطلب خطاب البنك من الموظف وصحح رقم الآيبان قبل إرسال الملف." } },
  ROUTING_UNKNOWN: { kind: "review", fix: { en: "Nothing to do in the " +
    "demo.", ar: "لا إجراء مطلوب في العرض التجريبي." } },
  OVERTIME_DAILY_CAP_EXCEEDED: { kind: "review", fix: { en: "Check the " +
    "overtime was agreed, and plan cover so no one works more than 2 " +
    "extra hours a day.", ar: "تحقق من الموافقة على العمل الإضافي " +
    "ونظّم البدلاء حتى لا يتجاوز أحد ساعتين إضافيتين يوميًا." } },
  DEDUCTION_DEFERRED: { kind: "review", fix: { en: "Agree a smaller " +
    "instalment with the employee, or let the rest move to next month.",
  ar: "اتفق مع الموظف على قسط أصغر؛ نقل المحرك الباقي إلى الشهر " +
    "التالي." } },
  SICK_UNPAID_PROBATION: { kind: "review", fix: { en: "Let the " +
    "employee know before payday.", ar: "أبلغ الموظف قبل يوم الصرف بأن " +
    "اليوم المرضي بدون أجر." } },
  DOCUMENT_EXPIRING: { kind: "renew-document", fix: { en: "Start the " +
    "renewal with the PRO now, before the expiry date.", ar: "ابدأ " +
    "التجديد الآن مع مندوب العلاقات الحكومية قبل تاريخ الانتهاء." } },
  PENSION_NOT_COMPUTED: { kind: "confirm-pension", fix: { en: "Confirm " +
    "the fund and the rate with the pension fund. Pension lines are " +
    "then added to these payslips.", ar: "أكد الصندوق والمعدل مع صندوق " +
    "المعاشات ثم أضف بنود المعاش قبل الاعتماد." } },
  SETTLEMENT_PARTIAL: { kind: "review", fix: { en: "Add notice pay and " +
    "any deductions before the settlement is paid.", ar: "أدخل بدل " +
    "الإنذار وأي خصومات يدويًا قبل صرف التسوية." } },
};

export const GENERIC: Fix = { kind: "review", fix: { en: "Review " +
  "before approving.", ar: "راجع قبل الاعتماد." } };
