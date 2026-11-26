import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { Role } from "./roles";
import { TraceLine } from "./trace";

export const TaskStatus = z.enum(["open", "in-progress", "done",
  "cancelled"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const FlowType = z.enum(["onboarding", "exit", "requisition",
  "goal"]);
export type FlowType = z.infer<typeof FlowType>;

export const TaskSource = z.enum(["manual", "onboarding-template",
  "exit-template", "probation-reminder", "exit-deadline"]);
export type TaskSource = z.infer<typeof TaskSource>;

const Title = z.string().trim().min(1).max(200);
const Body = z.string().trim().min(1).max(4000);

export const ChecklistItem = z.object({
  id: Id,
  label: z.string(),
  done: z.boolean(),
  doneBy: Id.nullable(),
  doneAt: Timestamp.nullable(),
  status: z.enum(["active", "removed"]),
});
export type ChecklistItem = z.infer<typeof ChecklistItem>;

export const TaskComment = z.object({
  id: Id,
  authorUserId: Id,
  body: z.string(),
  createdAt: Timestamp,
});
export type TaskComment = z.infer<typeof TaskComment>;

export const TaskFlow = z.object({ type: FlowType, id: Id });

export const TaskSummary = z.object({
  id: Id,
  title: z.string(),
  status: TaskStatus,
  assigneeUserId: Id.nullable(),
  assigneeRole: Role.nullable(),
  dueDate: IsoDate.nullable(),
  /** Open or in progress and due before today in Dubai. */
  overdue: z.boolean(),
  employeeId: Id.nullable(),
  flow: TaskFlow.nullable(),
  source: TaskSource,
  /** The engine trace line behind a legal due date, else null. */
  rule: TraceLine.nullable(),
  checklistDone: z.number().int().min(0),
  checklistTotal: z.number().int().min(0),
  commentCount: z.number().int().min(0),
  createdBy: Id,
  createdAt: Timestamp,
  completedAt: Timestamp.nullable(),
});
export type TaskSummary = z.infer<typeof TaskSummary>;

export const Task = TaskSummary.extend({
  description: z.string().nullable(),
  checklist: z.array(ChecklistItem),
  comments: z.array(TaskComment),
});
export type Task = z.infer<typeof Task>;

/** No flow: only the system links tasks to flows. */
export const TaskCreate = z.object({
  title: Title,
  description: z.string().max(4000).optional(),
  assigneeUserId: Id.optional(),
  dueDate: IsoDate.optional(),
  employeeId: Id.optional(),
  checklist: z.array(Title).max(30).optional(),
});
export type TaskCreate = z.infer<typeof TaskCreate>;

export const TaskUpdate = z.object({
  title: Title.optional(),
  description: z.string().max(4000).nullable().optional(),
  assigneeUserId: Id.nullable().optional(),
  dueDate: IsoDate.nullable().optional(),
  status: TaskStatus.optional(),
  addChecklist: z.array(Title).max(30).optional(),
});
export type TaskUpdate = z.infer<typeof TaskUpdate>;

export const TaskQuery = z.object({
  mine: z.literal("true").optional(),
  employeeId: Id.optional(),
  flowType: FlowType.optional(),
  flowId: Id.optional(),
  status: TaskStatus.optional(),
  dueBefore: IsoDate.optional(),
});
export type TaskQuery = z.infer<typeof TaskQuery>;

export const CommentCreate = z.object({ body: Body });
export type CommentCreate = z.infer<typeof CommentCreate>;

export const ChecklistItemUpdate = z.object({
  done: z.boolean().optional(),
  removed: z.literal(true).optional(),
});
export type ChecklistItemUpdate = z.infer<typeof ChecklistItemUpdate>;

export const TaskItemParams = z.object({ id: Id, itemId: Id });

export const TaskSummaryList = listOf(TaskSummary);
