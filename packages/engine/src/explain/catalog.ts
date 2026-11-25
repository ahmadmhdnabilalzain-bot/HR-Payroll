import { deepFreeze } from "../freeze";

export type Lang = "en" | "ar";

/** Trace line ids whose result is raw fils and must be shown as AED. */
export const MONEY_IDS: readonly string[] = deepFreeze([
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

/** Frozen: a caller cannot rewrite later explanations. */
export const MESSAGES: Record<Lang, Record<string, string>> = deepFreeze({
  en: EN,
  ar: AR,
});

/** Words for rule statuses, and the text used when no rule applies. */
const STATUS_EN: Record<string, string> = {
  official: "official", secondary: "secondary", convention: "convention",
  hypothetical: "hypothetical", unsourced: "unsourced", none: "no rules",
};

const STATUS_AR: Record<string, string> = {
  official: "رسمي", secondary: "ثانوي", convention: "عرف",
  hypothetical: "افتراضي", unsourced: "بلا مصدر", none: "بلا قواعد",
};

export const STATUS_WORDS: Record<Lang, Record<string, string>> =
  deepFreeze({ en: STATUS_EN, ar: STATUS_AR });

// NEEDS NATIVE REVIEW: Arabic wording of the engine's service length text.
export const YEARS_TEXT: Record<Lang, string> = deepFreeze({
  en: "{y} years and {d} days",
  ar: "{y} سنوات و{d} أيام",
});

/** Left-to-right isolate marks keep amounts intact inside Arabic text. */
export const LTR_ISOLATE: Record<Lang, readonly [string, string]> =
  deepFreeze({
    en: ["", ""],
    ar: ["\u2066", "\u2069"],
  });

export const UNTRANSLATED = "[untranslated]";
