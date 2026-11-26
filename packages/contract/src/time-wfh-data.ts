import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { ActivityCategory, WfhConsent } from "./time-wfh";

/** A whole minute: seconds and milliseconds are zero. */
const Minute = Timestamp.refine((t) => /T\d{2}:\d{2}:00(\.0+)?Z$/.test(t),
  { message: "a whole minute (seconds zero)" });

/** One yes-or-no per minute and one category; nothing else (strict). */
export const ActivityMinute = z.object({
  at: Minute,
  active: z.boolean(),
  category: ActivityCategory.nullable(),
}).strict();
export type ActivityMinute = z.infer<typeof ActivityMinute>;
export const WfhActivityUpload = z.object({
  attendanceId: Id,
  minutes: z.array(ActivityMinute).min(1).max(240),
}).strict();
export type WfhActivityUpload = z.infer<typeof WfhActivityUpload>;
export const WfhActivityResult = z.object({
  accepted: z.number().int().min(0), duplicates: z.number().int().min(0) });

/** The client must show the indicator before every reading. */
export const WfhLocationUpload = z.object({
  attendanceId: Id,
  at: Timestamp,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().int().min(0).max(100000),
  source: z.enum(["phone", "browser"]),
  indicatorShown: z.literal(true),
}).strict();
export type WfhLocationUpload = z.infer<typeof WfhLocationUpload>;
export const WfhLocationPoint = z.object({ at: Timestamp,
  lat: z.number(), lng: z.number(), source: z.enum(["phone", "browser"]) });
export type WfhLocationPoint = z.infer<typeof WfhLocationPoint>;
export const WfhLocationList = listOf(WfhLocationPoint);

const Counts = z.partialRecord(ActivityCategory, z.number().int().min(0));
export const WfhDayTotals = z.object({
  activeMinutes: z.number().int().min(0),
  idleMinutes: z.number().int().min(0),
  pausedMinutes: z.number().int().min(0),
  categories: Counts,
});
export type WfhDayTotals = z.infer<typeof WfhDayTotals>;
/** The employee's own day: hourly detail and locations. */
export const WfhDay = z.object({
  date: IsoDate,
  attendanceIds: z.array(Id),
  totals: WfhDayTotals,
  hours: z.array(z.object({ hour: z.string().regex(/^([01]\d|2[0-3])$/),
    activeMinutes: z.number().int().min(0), categories: Counts })),
  locations: z.array(WfhLocationPoint),
});
export type WfhDay = z.infer<typeof WfhDay>;
export const WfhDayList = listOf(WfhDay);
/** What a manager, hr or owner sees: totals and a count only. */
export const WfhDaySummary = z.object({ employeeId: Id, date: IsoDate,
  totals: WfhDayTotals, locationSamples: z.number().int().min(0) });
export const WfhDaySummaryList = listOf(WfhDaySummary);
export const WfhExport = z.object({
  generatedAt: Timestamp,
  employeeId: Id,
  consents: z.array(WfhConsent),
  pauses: z.array(z.object({ startedAt: Timestamp,
    endedAt: Timestamp.nullable() })),
  days: z.array(WfhDay),
  /** Every stored minute of the employee ("employee sees all"). */
  minutes: z.array(z.object({ at: Timestamp, active: z.boolean(),
    category: ActivityCategory.nullable(), attendanceId: Id })),
});
export type WfhExport = z.infer<typeof WfhExport>;

export const WfhRangeQuery = z.object({ from: IsoDate, to: IsoDate });
export const WfhSummaryQuery = WfhRangeQuery.extend({
  employeeId: Id.optional() });
export const WfhLocationQuery = WfhRangeQuery.extend({ employeeId: Id });
