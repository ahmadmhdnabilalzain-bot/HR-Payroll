import type { SubjectHandlers } from "../approvals/subjects";
import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { handleWhatsAppHook, whatsAppChallenge } from "../whatsapp/hook";

export function registerWhatsAppHookRoutes(app: App, deps: AppDeps,
  handlers: SubjectHandlers): void {
  register(app, deps, "whatsAppHookVerify", async (ctx) =>
    whatsAppChallenge(ctx));
  register(app, deps, "whatsAppHook", (ctx) =>
    handleWhatsAppHook(ctx, handlers));
}
