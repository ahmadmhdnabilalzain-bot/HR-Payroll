import type { RouteDef } from "@payroll/contract";
import type { Context } from "hono";
import { z, ZodError } from "zod";
import { ApiError } from "./errors";

export interface Validated {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
  body: unknown;
}

/** Prefixes each issue path with where it came from (body, query...). */
function prefixed(where: string, err: ZodError): ZodError {
  return new ZodError(err.issues.map((i) => ({ ...i,
    path: [where, ...i.path] })));
}

function parse(where: string, schema: z.ZodType | undefined,
  value: unknown): unknown {
  if (schema === undefined) return {};
  const r = schema.safeParse(value);
  if (!r.success) throw prefixed(where, r.error);
  return r.data;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError("VALIDATION_FAILED", "The body is not valid JSON",
      { fields: ["body"] });
  }
}

/** Zod-validates params, query, headers and body against the route. */
export async function validate(
  c: Context,
  def: RouteDef,
): Promise<Validated> {
  const params = parse("params", def.params, c.req.param()) as
    Record<string, unknown>;
  const query = parse("query", def.query, c.req.query()) as
    Record<string, unknown>;
  const wantsKey = def.headers?.shape["idempotency-key"] !== undefined;
  if (wantsKey && (c.req.header("idempotency-key") ?? "") === "") {
    throw new ApiError("IDEMPOTENCY_KEY_REQUIRED");
  }
  const headers = parse("headers", def.headers, c.req.header()) as
    Record<string, unknown>;
  const body = def.body === undefined ? undefined
    : parse("body", def.body, await readJson(c));
  return { params, query, headers, body };
}
