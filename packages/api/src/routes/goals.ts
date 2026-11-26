import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  addCheckIn,
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
} from "../goals/goals";

export function registerGoalRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listGoals", listGoals);
  register(app, deps, "createGoal", createGoal);
  register(app, deps, "getGoal", getGoal);
  register(app, deps, "updateGoal", updateGoal);
  register(app, deps, "addGoalCheckIn", addCheckIn);
}
