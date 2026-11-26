import { IdParams } from "./primitives";
import { ALL_ROLES, ten, type RouteDef } from "./route-def";
import {
  ChecklistItemUpdate,
  CommentCreate,
  Task,
  TaskCreate,
  TaskItemParams,
  TaskQuery,
  TaskSummaryList,
  TaskUpdate,
} from "./tasks";

const one = { params: IdParams };

const TASK_ROUTES: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listTasks", method: "GET", path: "/v1/tasks",
    query: TaskQuery, response: TaskSummaryList }),
  ten(ALL_ROLES, { id: "createTask", method: "POST", path: "/v1/tasks",
    body: TaskCreate, response: Task, status: 201 }),
  ten(ALL_ROLES, { id: "getTask", method: "GET", path: "/v1/tasks/{id}",
    ...one, response: Task }),
  ten(ALL_ROLES, { id: "updateTask", method: "PATCH",
    path: "/v1/tasks/{id}", ...one, body: TaskUpdate, response: Task }),
  ten(ALL_ROLES, { id: "addTaskComment", method: "POST",
    path: "/v1/tasks/{id}/comments", ...one, body: CommentCreate,
    response: Task, status: 201 }),
  ten(ALL_ROLES, { id: "updateChecklistItem", method: "PATCH",
    path: "/v1/tasks/{id}/checklist/{itemId}", params: TaskItemParams,
    body: ChecklistItemUpdate, response: Task }),
];

/** Plan 8: hiring, onboarding, tasks, exits and goals (all tenant). */
export const HR_ROUTES: readonly RouteDef[] = [
  ...TASK_ROUTES,
];
