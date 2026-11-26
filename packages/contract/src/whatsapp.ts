import { z } from "zod";
import { ProviderState } from "./channel-settings";
import { Timestamp } from "./primitives";

export const E164 = z.string().regex(/^\+[1-9]\d{7,14}$/);

export const WHATSAPP_CONSENT_VERSION = 1;

/** Arabic: draft, NEEDS NATIVE REVIEW; English is shown until then. */
export const WHATSAPP_CONSENT_TEXT = {
  en: "I agree that {company} may send me work messages on WhatsApp, " +
    "such as approval requests and notices, at the number below. " +
    "Messages pass through Meta's WhatsApp service. I can stop at any " +
    "time in the app or by replying STOP.",
  ar: "أوافق على أن ترسل لي {company} رسائل عمل عبر واتساب، مثل طلبات " +
    "الموافقة والإشعارات، على الرقم أدناه. تمر الرسائل عبر خدمة واتساب " +
    "التابعة لشركة Meta. يمكنني الإيقاف في أي وقت من التطبيق أو بالرد " +
    "بكلمة STOP.",
  arReviewed: false,
} as const;

export const WhatsAppOptInStart = z.object({
  phone: E164,
  consentVersion: z.literal(WHATSAPP_CONSENT_VERSION),
  agreed: z.literal(true),
});
export type WhatsAppOptInStart = z.infer<typeof WhatsAppOptInStart>;

export const WhatsAppVerify = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type WhatsAppVerify = z.infer<typeof WhatsAppVerify>;

export const OptInStatus = z.enum(["none", "pending", "active",
  "withdrawn"]);

export const MyChannels = z.object({
  email: z.object({ address: z.string() }),
  whatsapp: z.object({
    status: OptInStatus,
    phoneLast4: z.string().regex(/^\d{4}$/).nullable(),
    consentVersion: z.number().int().nullable(),
    consentedAt: Timestamp.nullable(),
  }),
  providers: z.object({ email: ProviderState, whatsapp: ProviderState }),
  consentText: z.string(),
});
export type MyChannels = z.infer<typeof MyChannels>;
