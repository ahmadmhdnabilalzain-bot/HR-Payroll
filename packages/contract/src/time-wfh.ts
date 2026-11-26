import { z } from "zod";
import { Id, IsoDate, Timestamp } from "./primitives";

/**
 * Work-from-home tracking exactly as the owner decided (LEDGER
 * 2026-11-25): active time, app and site CATEGORIES only, location
 * once an hour, while clocked in for remote work. A fixed product
 * category list, not law.
 */
export const ActivityCategory = z.enum(["communication", "meetings",
  "documents", "spreadsheets", "development", "design", "research",
  "business-apps", "social-media", "entertainment", "shopping", "news",
  "personal", "other"]);
export type ActivityCategory = z.infer<typeof ActivityCategory>;

/** Never collected, with no switch anywhere in the product. */
export const NEVER_COLLECTED = ["screenshots", "screen-video",
  "keystrokes", "page-contents", "window-titles", "web-addresses",
  "camera", "microphone"] as const;

export const RETENTION_SOURCE =
  "company setting; PDPL sets no period (Art 5(7))" as const;

const LegalReview = z.enum(["not-reviewed", "reviewed-by-company-counsel"]);
const Retention = z.number().int().min(1).max(3650);
const Bound = z.number().int().min(60).max(1440);
const Assessment = z.object({ done: z.boolean(),
  date: IsoDate.nullable() }).strict();

export const WfhSettings = z.object({
  enabled: z.boolean(),
  retentionDays: Retention.nullable(),
  activityCategories: z.boolean(),
  locationHourly: z.boolean(),
  maxTrackedMinutesPerRecord: Bound,
  impactAssessment: Assessment,
  legalReview: LegalReview,
  noticeVersion: z.number().int().nullable(),
  neverCollected: z.array(z.enum(NEVER_COLLECTED)),
  retentionSource: z.literal(RETENTION_SOURCE),
});
export type WfhSettings = z.infer<typeof WfhSettings>;

/** Strict: any other key (such as `screenshots`) is a 400. */
export const WfhSettingsUpdate = z.object({
  enabled: z.boolean().optional(),
  retentionDays: Retention.nullable().optional(),
  activityCategories: z.boolean().optional(),
  locationHourly: z.boolean().optional(),
  maxTrackedMinutesPerRecord: Bound.optional(),
  impactAssessment: Assessment.optional(),
  legalReview: LegalReview.optional(),
}).strict();
export type WfhSettingsUpdate = z.infer<typeof WfhSettingsUpdate>;

const Collects = z.object({ activeTime: z.literal(true),
  categories: z.boolean(), locationHourly: z.boolean() });

export const WfhNotice = z.object({
  version: z.number().int().min(1),
  publishedAt: Timestamp,
  textEn: z.string(),
  textAr: z.null(),
  arabicStatus: z.literal("not-reviewed"),
  collects: Collects,
  neverCollected: z.array(z.string()),
  retentionDays: z.number().int(),
  legalReview: LegalReview,
  companyNote: z.string().nullable(),
});
export type WfhNotice = z.infer<typeof WfhNotice>;
export const WfhNoticePublish = z.object({
  companyNote: z.string().min(1).max(2000).optional() }).strict();

export const WfhConsent = z.object({
  employeeId: Id,
  noticeVersion: z.number().int(),
  decision: z.enum(["granted", "declined", "withdrawn"]),
  at: Timestamp,
});
export type WfhConsent = z.infer<typeof WfhConsent>;
/** No employee field: only the person linked to the caller decides. */
export const WfhConsentCreate = z.object({
  noticeVersion: z.number().int().min(1),
  decision: z.enum(["granted", "declined"]),
}).strict();
export const WfhWithdraw = z.object({ erase: z.boolean() }).strict();
export const WfhWithdrawResult = z.object({ consent: WfhConsent,
  erasedRows: z.number().int().min(0) });

export const WfhState = z.enum(["off", "not-tracked", "needs-consent",
  "declined", "ready", "tracking", "paused", "stopped-limit"]);
export type WfhState = z.infer<typeof WfhState>;
export const WfhStatus = z.object({
  state: WfhState,
  attendanceId: Id.nullable(),
  trackedUntil: Timestamp.nullable(),
  lastLocationAt: Timestamp.nullable(),
  nextLocationDueAt: Timestamp.nullable(),
  collects: Collects,
  noticeVersion: z.number().int().nullable(),
});
export type WfhStatus = z.infer<typeof WfhStatus>;
