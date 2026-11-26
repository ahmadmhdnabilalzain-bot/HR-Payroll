import { ROUTES, type RouteDef } from "@payroll/contract";
import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { Env } from "./context";
import { ApiError, toErrorResponse } from "./errors";

/** Request bodies above 1 MiB are refused (413) unless a route says. */
export const DEFAULT_BODY_LIMIT = 1024 * 1024;

function tooLarge(c: Context<Env>) {
  const r = toErrorResponse(new ApiError("PAYLOAD_TOO_LARGE"),
    c.get("requestId"));
  return c.json(r.body, 413);
}

const limiter = (maxSize: number): MiddlewareHandler<Env> =>
  bodyLimit({ maxSize, onError: tooLarge });

/** Routes with their own `bodyLimit` (the receipt upload). */
const OWN_LIMIT = ROUTES.filter((r) => r.bodyLimit !== undefined)
  .map((r) => ({ method: r.method, path: new RegExp(
    `^${r.path.replace(/\{[a-zA-Z]+\}/g, "[^/]+")}$`) }));

/** The 1 MiB limit for every request but the routes with their own. */
export function defaultBodyLimit(): MiddlewareHandler<Env> {
  const base = limiter(DEFAULT_BODY_LIMIT);
  return (c, next) => OWN_LIMIT.some((r) => r.method === c.req.method &&
    r.path.test(c.req.path)) ? next() : base(c, next);
}

/** A route's own limit, for its method only (used with `app.use`). */
export function routeBodyLimit(def: RouteDef): MiddlewareHandler<Env> {
  const own = limiter(def.bodyLimit ?? DEFAULT_BODY_LIMIT);
  return (c, next) => c.req.method === def.method ? own(c, next) : next();
}
