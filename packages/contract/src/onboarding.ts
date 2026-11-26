import { z } from "zod";
import { EmployeeCreate, EmployeeView } from "./employee";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { TaskSummary } from "./tasks";
import { TraceLine } from "./trace";

export const TemplateKind = z.enum(["onboarding", "exit"]);
export type TemplateKind = z.infer<typeof TemplateKind>;

/** Offsets -60 to 365 days are product bounds, not law (Ruling 31). */
export const TemplateItem = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(["documents", "accounts", "equipment", "handover",
    "payroll", "other"]),
  assignee: z.enum(["hr", "manager", "employee", "owner"]),
  dueOffsetDays: z.number().int().min(-60).max(365),
  checklist: z.array(z.string().trim().min(1).max(200)).max(20)
    .optional(),
});
export type TemplateItem = z.infer<typeof TemplateItem>;

/** The label every default template carries. */
export const PRODUCT_DEFAULT_LABEL = "product default, not law";

export const ChecklistTemplate = z.object({
  kind: TemplateKind,
  version: z.number().int().min(0),
  items: z.array(TemplateItem).min(1).max(50),
  isDefault: z.boolean(),
  /** PRODUCT_DEFAULT_LABEL when `isDefault`, else null. */
  label: z.string().nullable(),
});
export type ChecklistTemplate = z.infer<typeof ChecklistTemplate>;

export const TemplatePut = z.object({
  items: z.array(TemplateItem).min(1).max(50),
});
export type TemplatePut = z.infer<typeof TemplatePut>;

export const TemplateParams = z.object({ kind: TemplateKind });

export const EmploymentTerms = z.object({
  employeeId: Id,
  probationMonths: z.number().int().min(0),
  probationEndDate: IsoDate.nullable(),
  employerNoticeDeadline: IsoDate.nullable(),
  contractNoticeDays: z.number().int(),
  /** Engine trace lines behind the dates and the notice check. */
  trace: z.array(TraceLine),
  updatedAt: Timestamp,
});
export type EmploymentTerms = z.infer<typeof EmploymentTerms>;

/** Legal limits are checked by the engine, not here. */
export const TermsPut = z.object({
  probationMonths: z.number().int().min(0),
  contractNoticeDays: z.number().int().min(1),
});
export type TermsPut = z.infer<typeof TermsPut>;

/** Same field schemas as `EmployeeCreate`. */
export const HireRequest = EmployeeCreate.pick({
  number: true,
  nationality: true,
  workerClass: true,
  fullNameAr: true,
  email: true,
  labourPersonId: true,
  emiratesIdNumber: true,
});
export type HireRequest = z.infer<typeof HireRequest>;

export const HireResult = z.object({
  employee: EmployeeView,
  terms: EmploymentTerms,
  flowId: Id,
  tasks: z.array(TaskSummary),
});
export type HireResult = z.infer<typeof HireResult>;

export const ChecklistTemplateList = listOf(ChecklistTemplate);
