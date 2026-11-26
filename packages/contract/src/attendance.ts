import { z } from "zod";
import { Id, IsoDate, Timestamp } from "./primitives";

export const AttendanceRecord = z.object({
  id: Id,
  employeeId: Id,
  /** Civil date in Asia/Dubai of the clock-in. */
  date: IsoDate,
  clockIn: Timestamp,
  clockOut: Timestamp.nullable(),
  /** Whole minutes, rounded down; null while open. */
  minutes: z.number().int().min(0).nullable(),
  /** "correction": an approved correction request (Plan 9 Ruling 7). */
  source: z.enum(["self", "hr", "correction"]),
  note: z.string().nullable(),
  /** Plan 9 (additive): how the record was clocked. */
  method: z.enum(["web", "phone", "unknown"]).optional(),
  workLocation: z.enum(["site", "remote"]).optional(),
  /** The geofence outcome; the location itself is never stored. */
  geofence: z.object({
    mode: z.enum(["off", "record", "require"]),
    result: z.enum(["inside", "outside", "no-location", "not-applied"]),
    siteId: Id.nullable(),
    distanceM: z.number().int().nullable(),
  }).optional(),
  exception: z.enum(["outside-geofence", "no-location"]).nullable()
    .optional(),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecord>;

/** A record longer than this is refused (Plan 9: a product bound). */
export const MAX_RECORD_MS = 24 * 3600 * 1000;

export const AttendanceCorrection = z.object({
  clockIn: Timestamp,
  clockOut: Timestamp.nullable(),
  note: z.string().min(3).max(1000),
}).refine((c) => c.clockOut === null ||
  Date.parse(c.clockOut) - Date.parse(c.clockIn) <= MAX_RECORD_MS,
{ message: "clockOut must be within 24 hours after clockIn",
  path: ["clockOut"] });
export type AttendanceCorrection = z.infer<typeof AttendanceCorrection>;

export const AttendanceQuery = z.object({
  employeeId: Id.optional(),
  from: IsoDate,
  to: IsoDate,
});
export type AttendanceQuery = z.infer<typeof AttendanceQuery>;
