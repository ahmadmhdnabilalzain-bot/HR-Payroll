import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";

/** Simple goal records: no ratings, no pay links, no AI (Ruling 25). */
export const GoalStatus = z.enum(["active", "achieved", "dropped"]);
export type GoalStatus = z.infer<typeof GoalStatus>;

const Title = z.string().trim().min(1).max(200);

export const GoalCreate = z.object({
  employeeId: Id.optional(),
  title: Title,
  description: z.string().max(2000).optional(),
  measure: z.string().max(200).optional(),
  target: z.string().max(200).optional(),
  dueDate: IsoDate.optional(),
});
export type GoalCreate = z.infer<typeof GoalCreate>;

export const GoalUpdate = z.object({
  title: Title.optional(),
  description: z.string().max(2000).nullable().optional(),
  measure: z.string().max(200).nullable().optional(),
  target: z.string().max(200).nullable().optional(),
  dueDate: IsoDate.nullable().optional(),
  status: GoalStatus.optional(),
});
export type GoalUpdate = z.infer<typeof GoalUpdate>;

export const CheckInCreate = z.object({
  progress: z.number().int().min(0).max(100),
  note: z.string().max(2000).optional(),
});
export type CheckInCreate = z.infer<typeof CheckInCreate>;

export const CheckIn = z.object({
  id: Id,
  authorUserId: Id,
  progress: z.number().int(),
  note: z.string().nullable(),
  at: Timestamp,
});

export const Goal = z.object({
  id: Id,
  employeeId: Id,
  title: z.string(),
  description: z.string().nullable(),
  measure: z.string().nullable(),
  target: z.string().nullable(),
  dueDate: IsoDate.nullable(),
  status: GoalStatus,
  createdBy: Id,
  createdAt: Timestamp,
  lastCheckIn: z.object({ progress: z.number().int(), at: Timestamp })
    .nullable(),
  /** Empty in lists. */
  checkIns: z.array(CheckIn),
});
export type Goal = z.infer<typeof Goal>;

export const GoalQuery = z.object({
  employeeId: Id.optional(),
  status: GoalStatus.optional(),
});

export const GoalList = listOf(Goal);
