import {
  NotificationKind,
  PREFS_NOTE,
  TEMPLATES,
  type NotificationPrefs,
} from "@payroll/contract";
import {
  listDeliveries,
  listNotifications,
  markRead,
} from "../channels/inbox";
import { getPrefs, putPrefs } from "../channels/prefs";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";

const own = (ctx: ReqCtx) => [ctx.tx, ctx.tenant!.companyId,
  ctx.user!.id] as const;

function templates() {
  return { items: NotificationKind.options.map((kind) => {
    const t = TEMPLATES[kind];
    return { kind, en: t.en, ar: t.ar, arReviewed: t.arReviewed,
      whatsappTemplate: t.whatsappTemplate };
  }) };
}

export function registerNotificationRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listNotifications", listNotifications);
  register(app, deps, "markNotificationsRead", markRead);
  register(app, deps, "getNotificationPrefs", async (ctx) =>
    ({ ...await getPrefs(...own(ctx)), note: PREFS_NOTE }));
  register(app, deps, "putNotificationPrefs",
    async (ctx: ReqCtx<NotificationPrefs>) => ({ ...await putPrefs(
      ...own(ctx), ctx.body, ctx.deps.now().toISOString()),
    note: PREFS_NOTE }));
  register(app, deps, "listNotificationDeliveries", listDeliveries);
  register(app, deps, "listNotificationTemplates", async () =>
    templates());
}
