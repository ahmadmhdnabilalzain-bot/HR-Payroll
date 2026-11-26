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
import type { Db } from "../db/db";
import { UUID, withTenant, type TenantCtx } from "../db/tenant";
import type { AppDeps, HandlerDeps } from "../deps";
import { routeBodyLimit } from "./body-limit";
import { ApiError, asError } from "./errors";
import { validate, type Validated } from "./validate";

export interface Env {
  Variables: {
    requestId: string;
    routeId: string | null;
    companyId: string | null;
    userId: string | null;
  };
}

export type App = Hono<Env>;

export type { HandlerDeps };

/** Opens one tenant transaction (public routes only). */
export type Enter = <T>(ctx: TenantCtx, fn: (tx: Db) => Promise<T>) =>
  Promise<T>;

export interface ReqCtx<B = any, Q = any, P = any, H = any> {
  deps: HandlerDeps;
  requestId: string;
  user: Authed["user"] | null;
  session: Authed["session"] | null;
  tenant: Tenant | null;
  /**
   * The request's one transaction: tenant routes run as payroll_app
   * with app.company_id = X-Company-Id and app.user_id = caller; user
   * routes with no company. Public routes have none (use `enter`).
   */
  tx: Db;
  enter: Enter;
  params: P;
  query: Q;
  body: B;
  headers: H;
  /** The request text, for `rawBody` routes (signed webhooks). */
  rawBody?: string | undefined;
  /** Any request header by lower-case name (signature, Basic auth). */
  rawHeader?: (name: string) => string | undefined;
}

/** Overrides the route's declared success status (e.g. a 200 replay). */
export class Reply {
  constructor(readonly status: 200 | 201, readonly body: unknown) {}
}

/** A text body with its own headers (the ICS feed). */
export class TextReply {
  constructor(readonly text: string,
    readonly headers: Record<string, string>) {}
}

/** A `text/plain` attachment (the SIF download). */
export class FileReply {
  constructor(readonly text: string, readonly fileName: string) {}
}

/**
 * Raw bytes (a receipt download): always an attachment under a
 * generated name, never sniffed by the browser, never cached.
 */
export class BinaryReply {
  constructor(readonly bytes: Uint8Array, readonly contentType: string,
    readonly fileName: string) {}
}

/**
 * Commit the transaction, then answer with this error (e.g. a failed
 * password check whose failure counter must stick).
 */
export class Refuse {
  constructor(readonly error: ApiError) {}
}

export type Handler = (ctx: ReqCtx) => Promise<unknown>;

const NO_TX: Db = new Proxy({} as Db, {
  get() {
    throw new Error("public routes have no transaction; use ctx.enter");
  },
});

const NO_ENTER: Enter = () => {
  throw new Error("only public routes open transactions");
};

function respond(c: Context<Env>, def: RouteDef, out: unknown) {
  if (out instanceof Refuse) throw out.error;
  if (out instanceof BinaryReply) return binary(c, out);
  if (out instanceof TextReply) {
    for (const [k, v] of Object.entries(out.headers)) c.header(k, v);
    return c.body(out.text, 200);
  }
  if (out instanceof FileReply) {
    c.header("Content-Disposition",
      `attachment; filename="${out.fileName}"`);
    return c.text(out.text, 200);
  }
  const status = out instanceof Reply ? out.status : def.status;
  const body = out instanceof Reply ? out.body : out;
  if (status === 204) return c.body(null, 204);
  if (def.contentType === "text/plain") return c.text(String(body), status);
  return c.json(body as object, status);
}

function binary(c: Context<Env>, out: BinaryReply) {
  c.header("Content-Type", out.contentType);
  c.header("Content-Disposition", `attachment; filename="${out.fileName}"`);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "no-store");
  return c.body(out.bytes as Uint8Array<ArrayBuffer>, 200);
}

/**
 * Registers a handler for a contract route id. Authentication, then
 * (in the request's one transaction) membership, role, MFA,
 * validation and the handler, in that order.
 */
export function register(app: App, deps: AppDeps, routeId: string,
  handler: Handler): void {
  const def = routeById(routeId);
  const path = def.path.replace(/\{([a-zA-Z]+)\}/g, ":$1");
  if (def.bodyLimit !== undefined) app.use(path, routeBodyLimit(def));
  app.on(def.method, path, async (c) => {
    c.set("routeId", def.id);
    try {
      return respond(c, def, await run(c, def, deps, handler));
    } catch (e) {
      throw asError(e);
    }
  });
}

function base(c: Context<Env>, deps: AppDeps, v: Validated) {
  const { db: _db, ...handlerDeps } = deps;
  return { deps: handlerDeps, requestId: c.get("requestId"), ...v,
    rawHeader: (name: string) => c.req.header(name) };
}

async function run(c: Context<Env>, def: RouteDef, deps: AppDeps,
  handler: Handler): Promise<unknown> {
  if (def.auth === "public") {
    // Read once: Hono caches it, so the JSON parse below reuses it.
    const rawBody = def.rawBody ? await c.req.text() : undefined;
    const v = await validate(c, def);
    const enter: Enter = (t, fn) => withTenant(deps.db, t, fn);
    return handler({ ...base(c, deps, v), user: null, session: null,
      tenant: null, tx: NO_TX, enter, rawBody });
  }
  const auth = await authenticate(deps, c.req.header("authorization"));
  c.set("userId", auth.user.id);
  if (def.auth === "user") {
    return withTenant(deps.db, { companyId: null, userId: auth.user.id },
      async (tx) => handler({ ...base(c, deps, await validate(c, def)),
        ...auth, tenant: null, tx, enter: NO_ENTER }));
  }
  return inTenant(c, def, deps, auth, handler);
}

async function inTenant(c: Context<Env>, def: RouteDef, deps: AppDeps,
  auth: Authed, handler: Handler): Promise<unknown> {
  const companyId = resolveCompanyHeader(c.req.header("x-company-id"));
  return withTenant(deps.db, { companyId, userId: auth.user.id },
    async (tx) => {
      const tenant = await resolveTenant(tx, auth, companyId);
      c.set("companyId", tenant.companyId);
      checkRole(def, tenant);
      checkMfa(def, auth);
      const v = await validate(c, def);
      return handler({ ...base(c, deps, v), ...auth, tenant, tx,
        enter: NO_ENTER });
    });
}

function resolveCompanyHeader(header: string | undefined): string {
  if (header === undefined || header === "") {
    throw new ApiError("COMPANY_HEADER_REQUIRED");
  }
  if (!UUID.test(header)) {
    throw new ApiError("VALIDATION_FAILED", undefined,
      { fields: ["headers.x-company-id"] });
  }
  return header.toLowerCase();
}
