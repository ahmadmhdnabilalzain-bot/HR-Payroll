import {
  getChannelSettings,
  putChannelSettings,
} from "../channels/settings";
import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";

export function registerChannelSettingsRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "getChannelSettings", (ctx) =>
    getChannelSettings(ctx.tx, ctx.deps, ctx.tenant!.companyId));
  register(app, deps, "putChannelSettings", putChannelSettings);
}
