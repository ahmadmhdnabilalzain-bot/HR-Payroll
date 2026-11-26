import {
  PRODUCT_DEFAULT_LABEL,
  type ChecklistTemplate,
  type TaskSource,
  type TemplateItem,
} from "@payroll/contract";
import {
  addDays,
  type ProbationResult,
  type Traced,
} from "@payroll/engine";
import type { Flow, NewTaskInput } from "../tasks/tasks";

export interface People {
  managerUserId: string | null;
  employeeUserId: string | null;
}

export interface Link {
  employeeId: string;
  flow: Flow;
  source: TaskSource;
}

/** hr and owner go to the role; manager and employee to their login. */
function assignee(i: TemplateItem, p: People) {
  const user = i.assignee === "manager" ? p.managerUserId
    : i.assignee === "employee" ? p.employeeUserId : null;
  if (user !== null) return { assigneeUserId: user, assigneeRole: null };
  const role = i.assignee === "owner" ? "owner" as const : "hr" as const;
  return { assigneeUserId: null, assigneeRole: role };
}

/** Pure: one task per template item, due anchor + offset days. */
export function expandTemplate(t: ChecklistTemplate, anchorDate: string,
  people: People, link: Link): NewTaskInput[] {
  const note = t.isDefault
    ? `From the default ${t.kind} checklist (${PRODUCT_DEFAULT_LABEL}).`
    : null;
  return t.items.map((i) => ({ title: i.title, description: note,
    ...assignee(i, people), dueDate: addDays(anchorDate, i.dueOffsetDays),
    employeeId: link.employeeId, flow: link.flow, source: link.source,
    rule: null, checklist: [...(i.checklist ?? [])] }));
}

/**
 * Pure: the two probation reminders, due on the engine's dates with
 * the engine's trace line as `rule`; none without probation.
 */
export function probationTasks(p: Traced<ProbationResult>,
  employeeId: string, managerUserId: string | null,
  flow: Flow | null = null): NewTaskInput[] {
  const { probationEndDate: end, employerNoticeDeadline: deadline } =
    p.value;
  if (end === null || deadline === null) return [];
  const line = (id: string) => p.trace.find((l) => l.id === id) ?? null;
  const who = managerUserId === null
    ? { assigneeUserId: null, assigneeRole: "hr" as const }
    : { assigneeUserId: managerUserId, assigneeRole: null };
  const base = { description: null, ...who, employeeId, flow,
    source: "probation-reminder" as const, checklist: [] };
  return [
    { ...base, title: "Probation decision: last day to give written notice",
      dueDate: deadline, rule: line("employment.probation.notice-deadline") },
    { ...base, title: "Probation ends", dueDate: end,
      rule: line("employment.probation.end") },
  ];
}
