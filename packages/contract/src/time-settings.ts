import { z } from "zod";
import { Id, IsoDate } from "./primitives";
import { TraceRule } from "./trace";

/** Shared time primitives (Plan 9). No statutory number lives here. */
export const Weekday = z.enum(["mon", "tue", "wed", "thu", "fri", "sat",
  "sun"]);
export type Weekday = z.infer<typeof Weekday>;
export const Hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
}).strict();
export type GeoPoint = z.infer<typeof GeoPoint>;
export const TraceRuleView = TraceRule;
export const TimeFlagView = z.object({
  code: z.string(),
  dates: z.array(IsoDate),
  detail: z.record(z.string(), z.string()),
  rule: TraceRuleView.nullable(),
});
export type TimeFlagView = z.infer<typeof TimeFlagView>;
export const RecordStatus = z.enum(["active", "removed"]);

const threshold = z.number().int().min(1).max(31);

/**
 * Company time settings. graceMinutes, the three thresholds and
 * accuracyAllowanceM are product defaults, not law (listed in
 * `productDefaults` while unchanged); restDays has no default.
 */
export const TimeSettings = z.object({
  restDays: z.array(Weekday).max(6),
  graceMinutes: z.number().int().min(0).max(120),
  lateFlagThreshold: threshold,
  restAdjacentAbsenceThreshold: threshold,
  shortSickSpellThreshold: threshold,
  accuracyAllowanceM: z.number().int().min(0).max(500),
  productDefaults: z.array(z.string()),
});
export type TimeSettings = z.infer<typeof TimeSettings>;

export const TimeSettingsUpdate = TimeSettings.omit({
  productDefaults: true }).partial().strict()
  .refine((s) => s.restDays === undefined ||
    new Set(s.restDays).size === s.restDays.length,
  { message: "restDays must be unique", path: ["restDays"] });
export type TimeSettingsUpdate = z.infer<typeof TimeSettingsUpdate>;

const HolidayName = z.string().trim().min(1).max(100);
export const Holiday = z.object({
  id: Id,
  date: IsoDate,
  name: HolidayName,
  nameAr: z.string().max(100).nullable(),
  kind: z.enum(["public", "company"]),
  status: RecordStatus,
});
export type Holiday = z.infer<typeof Holiday>;
export const HolidayCreate = z.object({
  date: IsoDate,
  name: HolidayName,
  nameAr: z.string().max(100).nullable().optional(),
  kind: z.enum(["public", "company"]),
}).strict();
export type HolidayCreate = z.infer<typeof HolidayCreate>;
export const HolidayUpdate = z.object({
  name: HolidayName.optional(),
  nameAr: z.string().max(100).nullable().optional(),
  status: RecordStatus.optional(),
}).strict();
export type HolidayUpdate = z.infer<typeof HolidayUpdate>;
export const YearQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export const SpecialPeriod = z.object({
  id: Id,
  kind: z.literal("ramadan"),
  name: HolidayName,
  start: IsoDate,
  end: IsoDate,
  status: RecordStatus,
});
export type SpecialPeriod = z.infer<typeof SpecialPeriod>;
export const SpecialPeriodCreate = z.object({
  kind: z.literal("ramadan"),
  name: HolidayName,
  start: IsoDate,
  end: IsoDate,
}).strict();
export type SpecialPeriodCreate = z.infer<typeof SpecialPeriodCreate>;
export const SpecialPeriodUpdate = z.object({
  name: HolidayName.optional(),
  status: RecordStatus.optional(),
}).strict();
export type SpecialPeriodUpdate = z.infer<typeof SpecialPeriodUpdate>;

const SiteFields = {
  name: z.string().trim().min(1).max(100),
  point: GeoPoint,
  radiusM: z.number().int().min(25).max(5000),
};
export const WorkSite = z.object({ id: Id, ...SiteFields,
  status: RecordStatus });
export type WorkSite = z.infer<typeof WorkSite>;
export const WorkSiteCreate = z.object(SiteFields).strict();
export type WorkSiteCreate = z.infer<typeof WorkSiteCreate>;
export const WorkSiteUpdate = z.object({ ...SiteFields,
  status: RecordStatus }).partial().strict();
export type WorkSiteUpdate = z.infer<typeof WorkSiteUpdate>;

const ProfileFields = {
  workMode: z.enum(["site", "remote", "hybrid"]),
  geofenceMode: z.enum(["off", "record", "require"]),
  workSiteIds: z.array(Id).max(20),
  wfhTracked: z.boolean(),
  shiftWorker: z.boolean(),
};
export const TimeProfile = z.object({ employeeId: Id, ...ProfileFields });
export type TimeProfile = z.infer<typeof TimeProfile>;
export const TimeProfileUpdate = z.object(ProfileFields).strict();
export type TimeProfileUpdate = z.infer<typeof TimeProfileUpdate>;
