import type { SubjectHandlers } from "./approvals/subjects";
import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import { registerNotificationRoutes } from
  "./routes/channels-notifications";
import { registerChannelSettingsRoutes } from "./routes/channels-settings";

/** Plan 13 routes: channels and integrations. */
export function registerChannelApp(app: App, deps: AppDeps,
  _handlers: SubjectHandlers): void {
  registerChannelSettingsRoutes(app, deps);
  registerNotificationRoutes(app, deps);
}
