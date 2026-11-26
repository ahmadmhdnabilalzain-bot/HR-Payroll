import type { AppDeps } from "../deps";
import type { App } from "../http/context";
import { registerTimeSettingsRoutes } from "./time-settings";

/** Every Plan 9 route group (contract TIME_ROUTES). */
export function registerTimeRoutes(app: App, deps: AppDeps): void {
  registerTimeSettingsRoutes(app, deps);
}
