export type Lang = "en" | "ar";

/** Trace line ids whose result is raw fils and must be shown as AED. */
export const MONEY_IDS: ReadonlySet<string> = new Set([
  "gratuity.cap", "gratuity.total", "leave.pay", "settlement.total",
]);

const EN: Record<string, string> = {
  "service.days": "Days of service counted: {result} ({rules}).",
  "service.years": "Completed service: {result} ({rules}).",
  "gratuity.tier1": "Gratuity days owed in tier 1: {result} ({rules}).",
  "gratuity.tier2": "Gratuity days owed in tier 2: {result} ({rules}).",
  "gratuity.cap": "Gratuity cap (limit on the total): {result} ({rules}).",
  "gratuity.total": "End-of-service gratuity: {result} ({rules}).",
  "leave.pay": "Pay for unused leave: {result} ({rules}).",
  "settlement.total": "Final settlement total: {result} ({rules}).",
};

// NEEDS NATIVE REVIEW: Arabic text below was authored by Claude and has
// not been confirmed by a native speaker. Amounts keep Western digits.
const AR: Record<string, string> = {
  "service.days": "أيام الخدمة المحتسبة: {result} ({rules}).",
  "service.years": "مدة الخدمة المكتملة: {result} ({rules}).",
  "gratuity.tier1":
    "أيام المكافأة المستحقة في الشريحة الأولى: {result} ({rules}).",
  "gratuity.tier2":
    "أيام المكافأة المستحقة في الشريحة الثانية: {result} ({rules}).",
  "gratuity.cap": "الحد الأقصى للمكافأة: {result} ({rules}).",
  "gratuity.total": "مكافأة نهاية الخدمة: {result} ({rules}).",
  "leave.pay": "بدل الإجازة غير المستخدمة: {result} ({rules}).",
  "settlement.total": "إجمالي التسوية النهائية: {result} ({rules}).",
};

export const MESSAGES: Record<Lang, Record<string, string>> = {
  en: EN,
  ar: AR,
};

/** Words for rule statuses, and the text used when no rule applies. */
export const STATUS_WORDS: Record<Lang, Record<string, string>> = {
  en: { official: "official", secondary: "secondary",
    convention: "convention", hypothetical: "hypothetical",
    unsourced: "unsourced", none: "no rules" },
  ar: { official: "رسمي", secondary: "ثانوي", convention: "عرف",
    hypothetical: "افتراضي", unsourced: "بلا مصدر",
    none: "بلا قواعد" },
};

export const UNTRANSLATED = "[untranslated]";
