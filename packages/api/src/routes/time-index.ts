import type { AppDeps } from "../deps";
import type { App } from "../http/context";
import { registerTimeSettingsRoutes } from "./time-settings";
import { registerTimeRosterRoutes } from "./time-rosters";
import { registerTimeSwapRoutes } from "./time-swaps";
import { registerTimeCorrectionRoutes } from "./time-corrections";
import { registerTimesheetRoutes } from "./time-timesheets";
import { registerTimeLeaveRoutes } from "./time-leave";

/** Every Plan 9 route group (contract TIME_ROUTES). */
export function registerTimeRoutes(app: App, deps: AppDeps): void {
  registerTimeSettingsRoutes(app, deps);
  registerTimeRosterRoutes(app, deps);
  registerTimeSwapRoutes(app, deps);
  registerTimeCorrectionRoutes(app, deps);
  registerTimesheetRoutes(app, deps);
  registerTimeLeaveRoutes(app, deps);
}
