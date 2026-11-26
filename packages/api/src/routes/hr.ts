import type { AppDeps } from "../deps";
import type { App } from "../http/context";
import { registerHiringRoutes } from "./hiring";
import { registerTaskRoutes } from "./tasks";

/** Plan 8's routes (the contract's HR_ROUTES). */
export function registerHrRoutes(app: App, deps: AppDeps): void {
  registerTaskRoutes(app, deps);
  registerHiringRoutes(app, deps);
}
