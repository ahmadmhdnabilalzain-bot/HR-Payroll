import type { SubjectHandlers } from "./approvals/subjects";
import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import { registerCalendarRoutes } from "./routes/channels-calendar";
import { registerInboundRoutes } from "./routes/channels-inbound";
import { registerSsoRoutes } from "./routes/channels-sso";
import { registerWebhookRoutes } from "./routes/channels-webhooks";
import { registerApiKeyRoutes } from "./routes/channels-apikeys";
import { registerDeveloperRoutes } from "./routes/channels-developer";
import { registerNotificationRoutes } from
  "./routes/channels-notifications";
import { registerChannelSettingsRoutes } from "./routes/channels-settings";
import { registerWhatsAppOptInRoutes } from "./routes/channels-whatsapp";
import { registerWhatsAppHookRoutes } from
  "./routes/channels-whatsapp-hook";

/** Plan 13 routes: channels and integrations. */
export function registerChannelApp(app: App, deps: AppDeps,
  handlers: SubjectHandlers): void {
  registerChannelSettingsRoutes(app, deps);
  registerNotificationRoutes(app, deps);
  registerWhatsAppOptInRoutes(app, deps);
  registerWhatsAppHookRoutes(app, deps, handlers);
  registerInboundRoutes(app, deps);
  registerCalendarRoutes(app, deps);
  registerSsoRoutes(app, deps);
  registerWebhookRoutes(app, deps);
  registerApiKeyRoutes(app, deps);
  registerDeveloperRoutes(app, deps);
}
