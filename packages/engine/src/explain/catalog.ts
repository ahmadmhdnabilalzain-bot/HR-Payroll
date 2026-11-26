import { deepFreeze } from "../freeze";
import {
  PAYROLL_AR,
  PAYROLL_EN,
  PAYROLL_MONEY_IDS,
} from "./payroll-catalog";

export type Lang = "en" | "ar";

/**
 * Message keys are trace line ids. A zero gratuity line uses
 * "gratuity.total.<outcome>" so the reason is shown. {in.x} is the
 * line's input x.
 */

/** Trace line ids whose result is raw fils and must be shown as AED. */
export const MONEY_IDS: readonly string[] = deepFreeze([
  "gratuity.cap", "gratuity.total", "leave.pay", "settlement.total",
  ...PAYROLL_MONEY_IDS,
]);

const EN: Record<string, string> = {
  "service.days": "Days of service counted: {result} ({rules}).",
  "service.years": "Completed service: {result} ({rules}).",
  "gratuity.tier1": "Gratuity days owed in tier 1: {result} ({rules}).",
  "gratuity.tier2": "Gratuity days owed in tier 2: {result} ({rules}).",
  "gratuity.cap": "Gratuity cap (limit on the total): {result} ({rules}).",
  "gratuity.total": "End-of-service gratuity: {result} ({rules}).",
  "gratuity.total.not-eligible": "End-of-service gratuity: {result}, " +
    "not eligible: {in.completedYears} completed years is below the " +
    "minimum of {in.minServiceYears} ({rules}).",
  "gratuity.total.not-applicable": "End-of-service gratuity: {result}, " +
    "not applicable: UAE nationals' end-of-service benefits fall under " +
    "the pension legislation, not the Labour Law gratuity ({rules}).",
  "leave.pay": "Pay for unused leave: {result} ({rules}).",
  "settlement.total": "Computed total (excludes notice pay, deductions " +
    "and other dues): {result} ({rules}).",
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
  "gratuity.total.not-eligible": "مكافأة نهاية الخدمة: {result}، " +
    "غير مستحقة: {in.completedYears} سنوات خدمة مكتملة أقل من الحد " +
    "الأدنى البالغ {in.minServiceYears} ({rules}).",
  "gratuity.total.not-applicable": "مكافأة نهاية الخدمة: {result}، " +
    "لا تنطبق: تخضع مستحقات نهاية الخدمة للمواطنين الإماراتيين " +
    "لتشريعات المعاشات، لا لمكافأة قانون العمل ({rules}).",
  "leave.pay": "بدل الإجازة غير المستخدمة: {result} ({rules}).",
  "settlement.total": "المجموع المحسوب (لا يشمل بدل الإنذار والخصومات " +
    "والمستحقات الأخرى): {result} ({rules}).",
};

/** Frozen: a caller cannot rewrite later explanations. */
export const MESSAGES: Record<Lang, Record<string, string>> = deepFreeze({
  en: { ...EN, ...PAYROLL_EN },
  ar: { ...AR, ...PAYROLL_AR },
});

/** Words for rule statuses, and the text used when no rule applies. */
const STATUS_EN: Record<string, string> = {
  official: "official", secondary: "secondary", convention: "convention",
  hypothetical: "hypothetical", unsourced: "unsourced", none: "no rules",
  overridden: "overridden",
};

// NEEDS NATIVE REVIEW: "convention" is "اختيار النظام" (the engine's
// choice). Do not use "عرف" (custom): custom is a source of law in Arabic
// legal usage, the opposite of what an engine convention is.
const STATUS_AR: Record<string, string> = {
  official: "رسمي", secondary: "ثانوي", convention: "اختيار النظام",
  hypothetical: "افتراضي", unsourced: "بلا مصدر", none: "بلا قواعد",
  overridden: "قيمة مستبدلة",
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
