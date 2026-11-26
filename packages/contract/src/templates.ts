import { z } from "zod";
import { NotificationKind } from "./notifications";
import { listOf } from "./primitives";

/**
 * Fixed words a template may insert, in both languages. Arabic here
 * and in TEMPLATES is a draft: NEEDS NATIVE REVIEW, never sent while
 * `arReviewed` is false (English goes out instead, Ruling 12).
 */
export const TEMPLATE_TERMS = {
  "subject.expense-claim": { en: "expense claim", ar: "مطالبة مصروفات" },
  "outcome.approved": { en: "approved", ar: "تمت الموافقة عليها" },
  "outcome.rejected": { en: "rejected", ar: "تم رفضها" },
  "outcome.returned": { en: "returned for changes", ar: "أعيدت للتعديل" },
  "provider.google": { en: "Google", ar: "Google" },
  "provider.microsoft": { en: "Microsoft", ar: "Microsoft" },
} as const satisfies Record<string, { en: string; ar: string }>;
export type TermKey = keyof typeof TEMPLATE_TERMS;

export type TemplateVar = { kind: "text" } | { kind: "date" } |
  { kind: "term"; prefix: string } | { kind: "code" };

interface Copy { subject: string; body: string }

export interface Template {
  vars: Record<string, TemplateVar>;
  en: Copy;
  ar: Copy;
  arReviewed: false;
  whatsappTemplate: string | null;
}

const TEXT = { kind: "text" } as const;
const DATE = { kind: "date" } as const;
const term = (prefix: string) => ({ kind: "term", prefix }) as const;

/** Message copy per kind. Names, dates, periods and terms only. */
export const TEMPLATES: Record<NotificationKind, Template> = {
  "approval-pending": {
    vars: { requester: TEXT, subject: term("subject.") },
    en: { subject: "Approval waiting: {subject}",
      body: "{requester} asked you to approve: {subject}. Open the app " +
        "to review it." },
    ar: { subject: "موافقة بانتظارك: {subject}",
      body: "طلب منك {requester} الموافقة على: {subject}. افتح التطبيق " +
        "لمراجعتها." },
    arReviewed: false, whatsappTemplate: "approval_pending_v1" },
  "approval-closed": {
    vars: { subject: term("subject."), outcome: term("outcome.") },
    en: { subject: "Your {subject} was {outcome}",
      body: "Your {subject} was {outcome}. Open the app for the details." },
    ar: { subject: "{subject} الخاصة بك {outcome}",
      body: "{subject} الخاصة بك {outcome}. افتح التطبيق للتفاصيل." },
    arReviewed: false, whatsappTemplate: "approval_closed_v1" },
  "leave-requested": {
    vars: { requester: TEXT, start: DATE, end: DATE },
    en: { subject: "Leave request from {requester}",
      body: "{requester} asked for leave from {start} to {end}. Open the " +
        "app to review it." },
    ar: { subject: "طلب إجازة من {requester}",
      body: "طلب {requester} إجازة من {start} إلى {end}. افتح التطبيق " +
        "لمراجعته." },
    arReviewed: false, whatsappTemplate: "leave_requested_v1" },
  "leave-decided": {
    vars: { start: DATE, end: DATE, outcome: term("outcome.") },
    en: { subject: "Your leave was {outcome}",
      body: "Your leave from {start} to {end} was {outcome}." },
    ar: { subject: "تم البت في إجازتك",
      body: "إجازتك من {start} إلى {end} {outcome}." },
    arReviewed: false, whatsappTemplate: "leave_decided_v1" },
  "payslip-available": {
    vars: { period: TEXT },
    en: { subject: "Your payslip is ready",
      body: "Your payslip for {period} is ready in the app." },
    ar: { subject: "قسيمة راتبك جاهزة",
      body: "قسيمة راتبك لشهر {period} جاهزة في التطبيق." },
    arReviewed: false, whatsappTemplate: "payslip_available_v1" },
  "inbound-received": {
    vars: {},
    en: { subject: "Forwarded email to review",
      body: "A forwarded email is waiting in the review inbox." },
    ar: { subject: "بريد محوّل للمراجعة",
      body: "يوجد بريد محوّل بانتظار المراجعة في صندوق الوارد." },
    arReviewed: false, whatsappTemplate: null },
  "webhook-paused": {
    vars: {},
    en: { subject: "A webhook was paused",
      body: "A webhook endpoint was paused after repeated failed " +
        "deliveries. Open the developer settings to check it." },
    ar: { subject: "تم إيقاف ويب هوك",
      body: "تم إيقاف نقطة ويب هوك بعد تكرار فشل الإرسال. افتح إعدادات " +
        "المطورين للتحقق." },
    arReviewed: false, whatsappTemplate: null },
  "security-sso-linked": {
    vars: { provider: term("provider.") },
    en: { subject: "New sign-in method added",
      body: "A {provider} sign-in was linked to your account. If this " +
        "was not you, tell your administrator now." },
    ar: { subject: "تمت إضافة طريقة دخول جديدة",
      body: "تم ربط تسجيل دخول {provider} بحسابك. إن لم تكن أنت، أبلغ " +
        "المسؤول فورًا." },
    arReviewed: false, whatsappTemplate: null },
  "channel-verify-code": {
    vars: { code: { kind: "code" } },
    en: { subject: "Your verification code",
      body: "Your verification code is {code}. It expires in 10 minutes. " +
        "Do not share it." },
    ar: { subject: "رمز التحقق الخاص بك",
      body: "رمز التحقق هو {code}. ينتهي خلال 10 دقائق. لا تشاركه مع " +
        "أحد." },
    arReviewed: false, whatsappTemplate: "verify_code_v1" },
};

const CopySchema = z.object({ subject: z.string(), body: z.string() });

export const TemplateInfo = z.object({
  kind: NotificationKind,
  en: CopySchema,
  ar: CopySchema,
  arReviewed: z.boolean(),
  whatsappTemplate: z.string().nullable(),
});
export const TemplateInfoList = listOf(TemplateInfo);
