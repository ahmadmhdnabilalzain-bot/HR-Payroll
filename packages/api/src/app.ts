import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppDeps } from "./deps";
import type { App, Env } from "./http/context";
import { ApiError, toErrorResponse } from "./http/errors";
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

/** Request bodies above 1 MiB are refused (413). */
const MAX_BODY = 1024 * 1024;

/** The HTTP app. Every route comes from the contract's ROUTES table. */
export function createApp(deps: AppDeps): App {
  const app = new Hono<Env>();
  app.use("*", requestMiddleware(deps));
  app.use("*", bodyLimit({ maxSize: MAX_BODY, onError: (c) => {
    const r = toErrorResponse(new ApiError("PAYLOAD_TOO_LARGE"),
      c.get("requestId"));
    return c.json(r.body, 413);
  } }));
  app.onError((err, c) => {
    const r = toErrorResponse(err, c.get("requestId"));
    if (r.status >= 500) deps.log({ requestId: c.get("requestId"),
      ...internalLine(err) });
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
  return app;
}
