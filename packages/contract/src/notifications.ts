import { z } from "zod";
import { Id, Lang, listOf, Timestamp } from "./primitives";

export const NotificationKind = z.enum(["approval-pending",
  "approval-closed", "leave-requested", "leave-decided",
  "payslip-available", "inbound-received", "webhook-paused",
  "security-sso-linked", "channel-verify-code"]);
export type NotificationKind = z.infer<typeof NotificationKind>;

export const Channel = z.enum(["in-app", "email", "whatsapp"]);
export type Channel = z.infer<typeof Channel>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const QuietHours = z.object({
  enabled: z.boolean(),
  start: HHMM,
  end: HHMM,
}).refine((q) => q.start !== q.end, { path: ["end"],
  message: "start and end must differ" });
export type QuietHours = z.infer<typeof QuietHours>;

/** Kinds a person can switch per channel (verify codes are not). */
export const PREF_KINDS = NotificationKind.options.filter((k) =>
  k !== "channel-verify-code") as Exclude<NotificationKind,
  "channel-verify-code">[];
export type PrefKind = (typeof PREF_KINDS)[number];

const KindPref = z.object({ email: z.boolean(), whatsapp: z.boolean() });

export const NotificationPrefs = z.object({
  language: Lang,
  quietHours: QuietHours,
  kinds: z.object(Object.fromEntries(PREF_KINDS.map((k) =>
    [k, KindPref])) as Record<PrefKind, typeof KindPref>),
});
export type NotificationPrefs = z.infer<typeof NotificationPrefs>;

export const PREF_DEFAULTS: NotificationPrefs = {
  language: "en",
  quietHours: { enabled: true, start: "22:00", end: "07:00" },
  kinds: Object.fromEntries(PREF_KINDS.map((k) =>
    [k, { email: true, whatsapp: false }])) as NotificationPrefs["kinds"],
};

export const PREFS_NOTE = "Quiet hours use UAE time. In-app notices " +
  "are always kept. Product defaults.";

export const NotificationPrefsView = NotificationPrefs.extend({
  note: z.literal(PREFS_NOTE),
});

export const DeliveryStatus = z.enum(["queued", "held", "sending", "sent",
  "failed", "skipped", "not-configured"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;

export const DeliverySkipReason = z.enum(["channel-off", "no-address",
  "no-opt-in", "not-configured", "rate-limited", "company-disabled",
  "fallback-not-needed", "not-a-member"]);
export type DeliverySkipReason = z.infer<typeof DeliverySkipReason>;

export const Notification = z.object({
  id: Id,
  kind: NotificationKind,
  title: z.string(),
  body: z.string(),
  link: z.object({ routeId: z.string(), id: Id.nullable() }).nullable(),
  createdAt: Timestamp,
  readAt: Timestamp.nullable(),
  deliveries: z.array(z.object({ channel: Channel,
    status: DeliveryStatus })),
});
export type Notification = z.infer<typeof Notification>;

export const NotificationPage = z.object({
  items: z.array(Notification),
  nextBefore: Timestamp.nullable(),
});

const Bool = z.enum(["true", "false"]).transform((v) => v === "true");
const Limit = z.coerce.number().int().min(1).max(100);

export const NotificationQuery = z.object({
  unreadOnly: Bool.optional(),
  before: Timestamp.optional(),
  limit: Limit.optional(),
});

export const MarkRead = z.union([
  z.object({ ids: z.array(Id).min(1).max(100) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);
export type MarkRead = z.infer<typeof MarkRead>;
export const MarkReadResult = z.object({ updated: z.number().int() });

/** A delivery as the log shows it: no rendered text, no address. */
export const DeliveryRow = z.object({
  id: Id,
  notificationId: Id.nullable(),
  userId: Id,
  channel: Channel,
  kind: NotificationKind,
  status: DeliveryStatus,
  reason: z.string().nullable(),
  attempts: z.number().int(),
  notBefore: Timestamp.nullable(),
  sentAt: Timestamp.nullable(),
  languageFallback: z.boolean(),
  provider: z.string().nullable(),
});
export type DeliveryRow = z.infer<typeof DeliveryRow>;
export const DeliveryRowList = listOf(DeliveryRow);

export const DeliveryQuery = z.object({
  status: DeliveryStatus.optional(),
  channel: Channel.optional(),
  userId: Id.optional(),
  before: Timestamp.optional(),
  limit: Limit.optional(),
});
