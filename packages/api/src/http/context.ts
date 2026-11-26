import { routeById, type RouteDef } from "@payroll/contract";
import type { Context, Hono } from "hono";
import {
  authenticate,
  checkMfa,
  checkRole,
  resolveTenant,
  type Authed,
  type Tenant,
} from "../auth/guard";
import type { AppDeps } from "../deps";
import { asError } from "./errors";
import { validate } from "./validate";

export interface Env {
  Variables: {
    requestId: string;
    routeId: string | null;
    companyId: string | null;
    userId: string | null;
  };
}

export type App = Hono<Env>;

export interface ReqCtx<B = any, Q = any, P = any, H = any> {
  deps: AppDeps;
  requestId: string;
  user: Authed["user"] | null;
  session: Authed["session"] | null;
  tenant: Tenant | null;
  params: P;
  query: Q;
  body: B;
  headers: H;
}

/** Overrides the route's declared success status (e.g. a 200 replay). */
export class Reply {
  constructor(readonly status: 200 | 201, readonly body: unknown) {}
}

export type Handler = (ctx: ReqCtx) => Promise<unknown>;

async function guard(c: Context<Env>, def: RouteDef, deps: AppDeps) {
  if (def.auth === "public") return { auth: null, tenant: null };
  const auth = await authenticate(deps, c.req.header("authorization"));
  c.set("userId", auth.user.id);
  if (def.auth === "user") return { auth, tenant: null };
  const tenant = await resolveTenant(deps, auth,
    c.req.header("x-company-id"));
  c.set("companyId", tenant.companyId);
  checkRole(def, tenant);
  checkMfa(def, auth);
  return { auth, tenant };
}

function respond(c: Context<Env>, def: RouteDef, out: unknown) {
  const status = out instanceof Reply ? out.status : def.status;
  const body = out instanceof Reply ? out.body : out;
  if (status === 204) return c.body(null, 204);
  if (def.contentType === "text/plain") return c.text(String(body), status);
  return c.json(body as object, status);
}

/**
 * Registers a handler for a contract route id: auth, role, MFA and
 * validation run first, in that order.
 */
export function register(app: App, deps: AppDeps, routeId: string,
  handler: Handler): void {
  const def = routeById(routeId);
  const path = def.path.replace(/\{([a-zA-Z]+)\}/g, ":$1");
  app.on(def.method, path, async (c) => {
    c.set("routeId", def.id);
    try {
      return respond(c, def, await run(c, def, deps, handler));
    } catch (e) {
      throw asError(e);
    }
  });
}

async function run(c: Context<Env>, def: RouteDef, deps: AppDeps,
  handler: Handler): Promise<unknown> {
  const { auth, tenant } = await guard(c, def, deps);
  const v = await validate(c, def);
  return handler({ deps, requestId: c.get("requestId"),
    user: auth?.user ?? null, session: auth?.session ?? null, tenant,
    ...v });
}
