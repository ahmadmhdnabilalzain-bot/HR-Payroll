import { buildDeveloperGuide, buildOpenApi } from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, TextReply, type App } from "../http/context";

const CACHE = { "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300" };

/** Both documents are built once and cached in memory. */
export function registerDeveloperRoutes(app: App, deps: AppDeps): void {
  let doc: string | null = null;
  let guide: string | null = null;
  register(app, deps, "getOpenApi", async () => {
    doc ??= JSON.stringify(buildOpenApi());
    return new TextReply(doc, CACHE);
  });
  register(app, deps, "getDeveloperGuide", async (ctx) => {
    guide ??= JSON.stringify(buildDeveloperGuide(
      ctx.deps.channels.publicApiBaseUrl ?? ""));
    return new TextReply(guide, CACHE);
  });
}
