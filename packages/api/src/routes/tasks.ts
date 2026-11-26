import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import {
  commentTask,
  createTask,
  fullTask,
  listTasks,
  visibleTask,
} from "../tasks/task-api";
import { updateChecklistItem, updateTask } from "../tasks/task-update";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;

export function registerTaskRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listTasks", listTasks);
  register(app, deps, "createTask", createTask);
  register(app, deps, "getTask", async (ctx: IdCtx) =>
    fullTask(ctx, (await visibleTask(ctx)).id));
  register(app, deps, "updateTask", updateTask);
  register(app, deps, "addTaskComment", commentTask);
  register(app, deps, "updateChecklistItem", updateChecklistItem);
}
