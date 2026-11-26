import { z } from "zod";

/**
 * Subject types WhatsApp may decide (a product rule, Ruling 8). Pay
 * runs, pay corrections, bank reveals and SIF downloads stay in the
 * app with MFA.
 */
export const CHANNEL_APPROVABLE_SUBJECTS = ["expense-claim"] as const;

/**
 * Body as `approval-pending`, with quick-reply buttons "Approve" and
 * "Reject". The Arabic template is a draft (NEEDS NATIVE REVIEW) and
 * unused while unreviewed.
 */
export const WHATSAPP_ACTION_TEMPLATE = "approval_pending_actions_v1";

/** Replies to the approver. Arabic: drafts, NEEDS NATIVE REVIEW. */
export const REPLY_TEXTS = {
  approved: { en: "Approved. Thank you.", ar: "تمت الموافقة. شكرًا لك." },
  reasonPrompt: { en: "Reply with the reason for rejecting (3 to 500 " +
    "characters) within 10 minutes, or open the app.",
  ar: "أرسل سبب الرفض (من 3 إلى 500 حرف) خلال 10 دقائق، أو افتح التطبيق." },
  rejected: { en: "Rejected. Your reason was saved with the decision.",
    ar: "تم الرفض. حُفظ السبب مع القرار." },
  stale: { en: "This request has changed or was already decided. Open " +
    "the app to see it.",
  ar: "تغيّر هذا الطلب أو تم البت فيه. افتح التطبيق لرؤيته." },
  refused: { en: "This decision cannot be made from WhatsApp. Open the " +
    "app.", ar: "لا يمكن اتخاذ هذا القرار عبر واتساب. افتح التطبيق." },
  stopped: { en: "You will get no more WhatsApp messages from this " +
    "service. You can turn them on again in the app.",
  ar: "لن تصلك رسائل واتساب أخرى من هذه الخدمة. يمكنك تفعيلها مجددًا " +
    "من التطبيق." },
} as const;
export type ReplyKey = keyof typeof REPLY_TEXTS;

/** Meta's subscription check (query names as Meta sends them). */
export const WhatsAppHookQuery = z.object({
  "hub.mode": z.string().max(50).optional(),
  "hub.verify_token": z.string().max(200).optional(),
  "hub.challenge": z.string().max(200).optional(),
});

export const HookChallenge = z.string();
export const HookAck = z.object({ ok: z.literal(true) });
