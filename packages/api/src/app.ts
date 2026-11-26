import { Hono, type MiddlewareHandler } from "hono";
import type { AppDeps } from "./deps";
import type { App, Env } from "./http/context";
import { ApiError, toErrorResponse } from "./http/errors";
import { defaultBodyLimit } from "./http/body-limit";
import { logRequest } from "./http/log";
import { registerAuthRoutes } from "./routes/auth";
import { registerCompanyRoutes } from "./routes/company";
import { registerDepartmentRoutes } from "./routes/departments";
import { registerEmployeeRoutes } from "./routes/employees";
import { registerLeaveRoutes } from "./routes/leave";
import { registerAttendanceRoutes } from "./routes/attendance";
import { registerPayRunRoutes } from "./routes/pay-runs";
import { registerSifRoutes } from "./routes/sif";
import { registerAuditRoutes } from "./routes/audit";
import { registerUserRoutes } from "./routes/users";
import { registerTimeRoutes } from "./routes/time-index";
import { registerHrRoutes } from "./routes/hr";
import {
  DEFAULT_SUBJECTS,
  registerExpenseApp,
  type ExpenseAppOpts,
} from "./expense-app";
import { handlerMap } from "./approvals/subjects";
import { registerChannelApp } from "./channel-app";
import { registerDocumentApp } from "./document-app";

function internalLine(err: unknown): Record<string, unknown> {
  const e = err as { name?: unknown; code?: unknown };
  return { level: "error", error: String(e?.name ?? "unknown"),
    code: typeof e?.code === "string" ? e.code : null };
}

/** Request id on every response and one log line per request. */
function requestMiddleware(deps: AppDeps): MiddlewareHandler<Env> {
  return async (c, next) => {
    const start = deps.now().getTime();
    const requestId = deps.newId();
    c.set("requestId", requestId);
    c.set("routeId", null);
    c.set("companyId", null);
    c.set("userId", null);
    await next();
    c.res.headers.set("X-Request-Id", requestId);
    logRequest(deps.log, { requestId, method: c.req.method,
      routeId: c.get("routeId"), status: c.res.status,
      ms: deps.now().getTime() - start, companyId: c.get("companyId"),
      userId: c.get("userId") });
  };
}

/** The HTTP app. Every route comes from the contract's ROUTES table. */
export function createApp(deps: AppDeps, opts: ExpenseAppOpts = {}): App {
  const app = new Hono<Env>();
  app.use("*", requestMiddleware(deps));
  app.use("*", defaultBodyLimit());
  app.onError((err, c) => {
    const r = toErrorResponse(err, c.get("requestId"));
    if (r.status >= 500) deps.log({ requestId: c.get("requestId"),
      ...internalLine(err) });
    const wait = (err as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    if (typeof wait === "number") c.header("Retry-After", String(wait));
    return c.json(r.body, r.status as 500);
  });
  app.notFound((c) => {
    const r = toErrorResponse(new ApiError("NOT_FOUND"), c.get("requestId"));
    return c.json(r.body, 404);
  });
  registerAuthRoutes(app, deps);
  registerCompanyRoutes(app, deps);
  registerUserRoutes(app, deps);
  registerEmployeeRoutes(app, deps);
  registerDepartmentRoutes(app, deps);
  registerLeaveRoutes(app, deps);
  registerAttendanceRoutes(app, deps);
  registerPayRunRoutes(app, deps);
  registerSifRoutes(app, deps);
  registerAuditRoutes(app, deps);
  registerTimeRoutes(app, deps);
  registerHrRoutes(app, deps);
  registerExpenseApp(app, deps, opts);
  registerDocumentApp(app, deps);
  registerChannelApp(app, deps,
    handlerMap(opts.subjects ?? DEFAULT_SUBJECTS));
  return app;
}
