import {
  CHANNEL_DEFAULTS,
  CHANNEL_DEFAULTS_NOTE,
  type ChannelSettings,
  type ProviderStatus,
} from "./channel-settings";
import {
  PREF_DEFAULTS,
  PREFS_NOTE,
  type DeliveryRow,
  type Notification,
} from "./notifications";
import { TEMPLATES } from "./templates";
import { WHATSAPP_CONSENT_TEXT, type MyChannels } from "./whatsapp";

const ID = "00000000-0000-4000-8000-000000000d01";
const USER = "00000000-0000-4000-8000-000000000d02";
const AT = "2026-03-01T08:00:00.000Z";

const providers: ProviderStatus = { email: "configured",
  whatsapp: "not-configured", inboundEmail: "not-configured",
  googleSso: "not-configured", microsoftSso: "not-configured" };

const settings: ChannelSettings = { ...CHANNEL_DEFAULTS, version: 1,
  providers, note: CHANNEL_DEFAULTS_NOTE };

const notice: Notification = { id: ID, kind: "approval-pending",
  title: "Approval waiting: expense claim",
  body: "Sara A asked you to approve: expense claim. Open the app to " +
    "review it.", link: { routeId: "approvalInbox", id: null },
  createdAt: AT, readAt: null,
  deliveries: [{ channel: "email", status: "sent" }] };

const delivery: DeliveryRow = { id: ID, notificationId: ID, userId: USER,
  channel: "email", kind: "approval-pending", status: "sent", reason: null,
  attempts: 1, notBefore: null, sentAt: AT, languageFallback: false,
  provider: "email" };

const t = TEMPLATES["approval-pending"];
const template = { kind: "approval-pending", en: t.en, ar: t.ar,
  arReviewed: false, whatsappTemplate: t.whatsappTemplate };

const mine: MyChannels = { email: { address: "sara@example.com" },
  whatsapp: { status: "active", phoneLast4: "0001", consentVersion: 1,
    consentedAt: AT }, providers: { email: "configured",
    whatsapp: "configured" },
  consentText: WHATSAPP_CONSENT_TEXT.en.replace("{company}", "Acme LLC") };

/** One valid example per Plan 13 schema, keyed by schema name. */
export const CHANNEL_EXAMPLES: Readonly<Record<string, unknown>> = {
  ProviderStatus: providers,
  ChannelSettingsBody: CHANNEL_DEFAULTS,
  ChannelSettings: settings,
  ChannelSettingsUpdate: { ...CHANNEL_DEFAULTS, expectedVersion: 0 },
  QuietHours: PREF_DEFAULTS.quietHours,
  NotificationPrefs: PREF_DEFAULTS,
  NotificationPrefsView: { ...PREF_DEFAULTS, note: PREFS_NOTE },
  Notification: notice,
  NotificationPage: { items: [notice], nextBefore: null },
  MarkRead: { all: true },
  MarkReadResult: { updated: 1 },
  DeliveryRow: delivery,
  DeliveryRowList: { items: [delivery] },
  TemplateInfo: template,
  TemplateInfoList: { items: [template] },
  WhatsAppOptInStart: { phone: "+971500000001", consentVersion: 1,
    agreed: true },
  WhatsAppVerify: { code: "123456" },
  MyChannels: mine,
};
