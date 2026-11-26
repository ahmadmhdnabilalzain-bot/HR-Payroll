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
  source: z.enum(["self", "hr"]),
  note: z.string().nullable(),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecord>;

export const AttendanceCorrection = z.object({
  clockIn: Timestamp,
  clockOut: Timestamp.nullable(),
  note: z.string().min(3).max(1000),
});
export type AttendanceCorrection = z.infer<typeof AttendanceCorrection>;

export const AttendanceQuery = z.object({
  employeeId: Id.optional(),
  from: IsoDate,
  to: IsoDate,
});
export type AttendanceQuery = z.infer<typeof AttendanceQuery>;
