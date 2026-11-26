import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { Hhmm, TimeFlagView } from "./time-settings";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 +
  Number(t.slice(3, 5));
/** Minutes from start to end, crossing midnight when end < start. */
export function shiftSpan(start: string, end: string): number {
  return (toMin(end) - toMin(start) + 1440) % 1440;
}

const ShiftName = z.string().trim().min(1).max(60);
const Break = z.number().int().min(0).max(240);

/**
 * A shift template. `crossesMidnight` and `netMinutes` are derived;
 * end equal to start, or a break as long as the span, is refused.
 */
export const ShiftTemplate = z.object({
  id: Id,
  name: ShiftName,
  nameAr: z.string().max(60).nullable(),
  start: Hhmm,
  end: Hhmm,
  breakMinutes: Break,
  crossesMidnight: z.boolean(),
  netMinutes: z.number().int().min(1),
  status: z.enum(["active", "retired"]),
});
export type ShiftTemplate = z.infer<typeof ShiftTemplate>;

const validShift = (s: { start: string; end: string;
  breakMinutes: number }) => s.start !== s.end &&
  s.breakMinutes < shiftSpan(s.start, s.end);

export const ShiftTemplateCreate = z.object({
  name: ShiftName,
  nameAr: z.string().max(60).nullable().optional(),
  start: Hhmm,
  end: Hhmm,
  breakMinutes: Break,
}).strict().refine(validShift, { message: "end must differ from start " +
  "and the break must be shorter than the span", path: ["breakMinutes"] });
export type ShiftTemplateCreate = z.infer<typeof ShiftTemplateCreate>;

export const ShiftTemplateUpdate = z.object({
  name: ShiftName.optional(),
  nameAr: z.string().max(60).nullable().optional(),
  start: Hhmm.optional(),
  end: Hhmm.optional(),
  breakMinutes: Break.optional(),
  status: z.enum(["active", "retired"]).optional(),
}).strict();
export type ShiftTemplateUpdate = z.infer<typeof ShiftTemplateUpdate>;

export const RosterSlot = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("shift"), shiftTemplateId: Id, start: Hhmm,
    end: Hhmm, breakMinutes: Break, netMinutes: z.number().int() }),
  z.object({ kind: z.literal("rest") }),
]);
export type RosterSlot = z.infer<typeof RosterSlot>;

export const RosterDay = z.object({
  employeeId: Id,
  date: IsoDate,
  draft: RosterSlot.nullable(),
  published: RosterSlot.nullable(),
  publishedAt: Timestamp.nullable(),
  changedSincePublish: z.boolean(),
  version: z.number().int().min(0),
});
export type RosterDay = z.infer<typeof RosterDay>;
export const RosterDayList = listOf(RosterDay);

export const RosterQuery = z.object({
  from: IsoDate,
  to: IsoDate,
  employeeId: Id.optional(),
  departmentId: Id.optional(),
});
export type RosterQuery = z.infer<typeof RosterQuery>;

export const SlotInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("shift"), shiftTemplateId: Id }).strict(),
  z.object({ kind: z.literal("rest") }).strict(),
]);
export type SlotInput = z.infer<typeof SlotInput>;

export const RosterPut = z.object({
  entries: z.array(z.object({ employeeId: Id, date: IsoDate,
    slot: SlotInput.nullable() }).strict()).min(1).max(500),
}).strict();
export type RosterPut = z.infer<typeof RosterPut>;

export const EmployeeFlag = TimeFlagView.extend({ employeeId: Id });
export type EmployeeFlag = z.infer<typeof EmployeeFlag>;

export const RosterResult = z.object({
  days: z.array(RosterDay),
  flags: z.array(EmployeeFlag),
});
export type RosterResult = z.infer<typeof RosterResult>;

export const RotationApply = z.object({
  employeeIds: z.array(Id).min(1).max(100),
  from: IsoDate,
  to: IsoDate,
  pattern: z.array(Id.nullable()).min(1).max(28),
}).strict();
export type RotationApply = z.infer<typeof RotationApply>;

export const RosterPublish = z.object({
  from: IsoDate,
  to: IsoDate,
  employeeIds: z.array(Id).min(1).max(500).optional(),
}).strict();
export type RosterPublish = z.infer<typeof RosterPublish>;

export const PublishResult = z.object({
  published: z.number().int().min(0),
  flags: z.array(EmployeeFlag),
});
export type PublishResult = z.infer<typeof PublishResult>;

export const SwapStatus = z.enum(["pending-peer", "pending-approval",
  "approved", "rejected", "declined", "cancelled"]);
export const SwapRequest = z.object({
  id: Id,
  requesterEmployeeId: Id,
  date: IsoDate,
  peerEmployeeId: Id,
  peerDate: IsoDate,
  status: SwapStatus,
  requesterSlot: RosterSlot,
  peerSlot: RosterSlot,
  flagsAfter: z.array(EmployeeFlag),
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
export type SwapRequest = z.infer<typeof SwapRequest>;
export const SwapRequestList = listOf(SwapRequest);
export const SwapCreate = z.object({
  date: IsoDate,
  withEmployeeId: Id,
  withDate: IsoDate.optional(),
}).strict();
export type SwapCreate = z.infer<typeof SwapCreate>;
export const SwapRespond = z.object({ accept: z.boolean() }).strict();
export const SwapDecision = z.object({
  note: z.string().min(1).max(500).optional(),
}).strict();
export const ShiftTemplateList = listOf(ShiftTemplate);
