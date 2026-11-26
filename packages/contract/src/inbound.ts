import { z } from "zod";
import { ProviderState } from "./channel-settings";
import { Id, listOf, Timestamp } from "./primitives";
import { ReceiptContentType } from "./receipts";

export const INBOUND_PROCESSING_NOTE = "Forwarded emails pass through " +
  "the email provider set up for this service before they reach this " +
  "system. Where that provider stores mail was not verified. Turn this " +
  "on only if your company accepts that.";

/** An exact address, or `@domain` (that domain only, no subdomains). */
export const AllowEntry = z.string().max(254).regex(
  /^([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9.-]+\.[a-z]{2,})$/);

export const InboundSettingsBody = z.object({
  enabled: z.boolean(),
  allowlist: z.array(AllowEntry).max(200)
    .refine((l) => new Set(l).size === l.length, "entries must be unique"),
  acknowledgedProcessing: z.boolean(),
}).refine((b) => !b.enabled || b.acknowledgedProcessing,
  { path: ["acknowledgedProcessing"],
    message: "acknowledge the processing note first" });
export type InboundSettingsBody = z.infer<typeof InboundSettingsBody>;

export const InboundSettings = z.object({
  enabled: z.boolean(),
  allowlist: z.array(z.string()),
  acknowledgedProcessing: z.boolean(),
  version: z.number().int().min(0),
  address: z.string().nullable(),
  provider: ProviderState,
  note: z.literal(INBOUND_PROCESSING_NOTE),
});
export type InboundSettings = z.infer<typeof InboundSettings>;

export const InboundSettingsUpdate = z.object({
  enabled: z.boolean(),
  allowlist: z.array(AllowEntry).max(200),
  acknowledgedProcessing: z.boolean(),
  expectedVersion: z.number().int().min(0),
}).refine((b) => new Set(b.allowlist).size === b.allowlist.length,
  { path: ["allowlist"], message: "entries must be unique" })
  .refine((b) => !b.enabled || b.acknowledgedProcessing,
    { path: ["acknowledgedProcessing"],
      message: "acknowledge the processing note first" });
export type InboundSettingsUpdate = z.infer<typeof InboundSettingsUpdate>;

export const AuthVerdict = z.enum(["pass", "fail", "softfail", "neutral",
  "none", "unknown"]);
export const SenderAuth = z.object({ spf: AuthVerdict, dkim: AuthVerdict,
  dmarc: AuthVerdict });
export type SenderAuth = z.infer<typeof SenderAuth>;

export const InboundStatus = z.enum(["received", "accepted", "dismissed",
  "rejected"]);
export const InboundRejectReason = z.enum(["DISABLED", "RATE_LIMITED",
  "SENDER_NOT_ALLOWED", "SENDER_AUTH_FAILED"]);
export const AttachmentSkip = z.enum(["TYPE_NOT_ALLOWED", "TOO_LARGE",
  "TYPE_MISMATCH", "TOO_MANY"]);
export type AttachmentSkip = z.infer<typeof AttachmentSkip>;
export const InboundFlag = z.enum(["SENDER_UNVERIFIED",
  "ATTACHMENT_SKIPPED"]);

export const InboundItem = z.object({
  id: Id,
  status: InboundStatus,
  receivedAt: Timestamp,
  fromAddress: z.string().nullable(),
  matchedEmployee: z.object({ employeeId: Id, name: z.string() })
    .nullable(),
  subject: z.string(),
  textPreview: z.string(),
  auth: SenderAuth,
  flags: z.array(InboundFlag),
  attachments: z.array(z.object({
    index: z.number().int(),
    fileName: z.string(),
    contentType: ReceiptContentType.nullable(),
    size: z.number().int(),
    status: z.enum(["kept", "skipped"]),
    skip: AttachmentSkip.nullable(),
  })),
  rejectReason: InboundRejectReason.nullable(),
  decision: z.object({
    by: Id,
    at: Timestamp,
    as: z.enum(["receipt", "claim-draft", "dismissed"]),
    receiptIds: z.array(Id),
    claimId: Id.nullable(),
  }).nullable(),
});
export type InboundItem = z.infer<typeof InboundItem>;
export const InboundItemList = listOf(InboundItem);

export const InboundQuery = z.object({
  status: InboundStatus.optional(),
  before: Timestamp.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const InboundAccept = z.object({
  as: z.enum(["receipt", "claim-draft"]),
  employeeId: Id,
  attachmentIndexes: z.array(z.number().int().min(0).max(9)).min(1).max(10)
    .refine((l) => new Set(l).size === l.length, "indexes must be unique"),
  title: z.string().trim().min(1).max(120).optional(),
}).refine((b) => b.as !== "claim-draft" || b.title !== undefined,
  { path: ["title"], message: "a draft claim needs a title" });
export type InboundAccept = z.infer<typeof InboundAccept>;

export const InboundDismiss = z.object({
  reason: z.enum(["spam", "duplicate", "not-relevant", "other"]),
});
export type InboundDismiss = z.infer<typeof InboundDismiss>;

export const InboundHookParams = z.object({
  provider: z.enum(["postmark"]),
});
export const InboundAttachmentParams = z.object({
  id: Id,
  index: z.coerce.number().int().min(0).max(9),
});
export const InboundAttachmentContent = z.string();
