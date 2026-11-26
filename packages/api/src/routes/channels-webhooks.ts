import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { listDeliveries } from "../webhooks/deliveries";
import {
  createEndpoint,
  listEndpoints,
  redeliver,
  rotateSecret,
  testEndpoint,
  updateEndpoint,
} from "../webhooks/endpoints";

export function registerWebhookRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listWebhookEndpoints", listEndpoints);
  register(app, deps, "createWebhookEndpoint", createEndpoint);
  register(app, deps, "updateWebhookEndpoint", updateEndpoint);
  register(app, deps, "rotateWebhookSecret", rotateSecret);
  register(app, deps, "testWebhookEndpoint", testEndpoint);
  register(app, deps, "listWebhookDeliveries", listDeliveries);
  register(app, deps, "redeliverWebhook", redeliver);
}
