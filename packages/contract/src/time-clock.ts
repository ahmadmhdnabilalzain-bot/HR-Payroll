import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { GeoPoint } from "./time-settings";

export const ClockMethod = z.enum(["web", "phone"]);
export const WorkLocation = z.enum(["site", "remote"]);
export type WorkLocation = z.infer<typeof WorkLocation>;

/**
 * Optional clock-in and clock-out body. Plan 3 clients that send no
 * body still work (method stored as "unknown"). The location is used
 * once for the geofence and never stored, logged or audited.
 */
export const ClockBody = z.object({
  method: ClockMethod,
  workLocation: WorkLocation.optional(),
  location: GeoPoint.extend({
    accuracyM: z.number().int().min(0).max(100000) }).strict().optional(),
  locationDecision: z.enum(["shared", "declined", "unavailable"])
    .optional(),
}).strict();
export type ClockBody = z.infer<typeof ClockBody>;

/** Shown by the client before it reads a location at clock-in. */
export const CLOCK_LOCATION_NOTICE = "Your location is checked once " +
  "against your work site and then discarded. Only inside or outside " +
  "and the distance are kept.";

export const GeofenceView = z.object({
  mode: z.enum(["off", "record", "require"]),
  result: z.enum(["inside", "outside", "no-location", "not-applied"]),
  siteId: Id.nullable(),
  distanceM: z.number().int().nullable(),
});
export type GeofenceView = z.infer<typeof GeofenceView>;

export const CorrectionStatus = z.enum(["pending", "approved", "rejected",
  "cancelled"]);
export const CorrectionRequest = z.object({
  id: Id,
  employeeId: Id,
  attendanceId: Id.nullable(),
  date: IsoDate,
  clockIn: Timestamp,
  clockOut: Timestamp.nullable(),
  reason: z.string(),
  status: CorrectionStatus,
  requestedBy: Id,
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  decisionNote: z.string().nullable(),
});
export type CorrectionRequest = z.infer<typeof CorrectionRequest>;
export const CorrectionRequestList = listOf(CorrectionRequest);

/** For self only; `employeeId`, when sent, must be the caller's own. */
export const CorrectionCreate = z.object({
  employeeId: Id.optional(),
  attendanceId: Id.optional(),
  date: IsoDate,
  clockIn: Timestamp,
  clockOut: Timestamp.nullable(),
  reason: z.string().min(3).max(500),
}).strict();
export type CorrectionCreate = z.infer<typeof CorrectionCreate>;

export const CorrectionQuery = z.object({
  employeeId: Id.optional(),
  status: CorrectionStatus.optional(),
});
export type CorrectionQuery = z.infer<typeof CorrectionQuery>;

export const CorrectionReject = z.object({
  note: z.string().min(1).max(500).optional(),
}).strict();
