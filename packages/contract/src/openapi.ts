import { z } from "zod";
import { SCHEMAS, schemaName } from "./registry";
import { ROUTES, type RouteDef } from "./routes";

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
}

type Io = "input" | "output";
type Json = Record<string, unknown>;

function jsonSchema(s: z.ZodType, io: Io): Json {
  const out = z.toJSONSchema(s, { io, unrepresentable: "any" }) as Json;
  delete out.$schema;
  return out;
}

/** A `$ref` for registered schemas, the inline schema otherwise. */
function schemaOrRef(s: z.ZodType, io: Io): Json {
  const name = schemaName(s);
  if (name !== null) return { $ref: `#/components/schemas/${name}` };
  return jsonSchema(s, io);
}

function parametersOf(r: RouteDef): Json[] {
  const out: Json[] = [];
  const add = (where: string, obj: z.ZodObject | undefined) => {
    for (const [name, s] of Object.entries(obj?.shape ?? {})) {
      const schema = s as z.ZodType;
      out.push({ name, in: where, required: !schema.safeParse(undefined)
        .success, schema: jsonSchema(schema, "input") });
    }
  };
  add("path", r.params);
  add("query", r.query);
  add("header", r.headers);
  if (r.auth === "tenant") {
    out.push({ name: "X-Company-Id", in: "header", required: true,
      schema: { type: "string", format: "uuid" } });
  }
  return out;
}

function errorStatuses(r: RouteDef): string[] {
  if (r.auth === "public") return ["400", "401", "409", "410", "423",
    "500"];
  if (r.auth === "user") return ["400", "401", "403", "409", "500"];
  return ["400", "401", "403", "404", "409", "410", "422", "500"];
}

function responsesOf(r: RouteDef): Json {
  const out: Json = {};
  if (r.status === 204) out["204"] = { description: "No content" };
  else {
    const type = r.contentType ?? "application/json";
    out[String(r.status)] = { description: "Success", content: {
      [type]: { schema: schemaOrRef(r.response, "output") } } };
  }
  const error = { $ref: "#/components/schemas/ApiErrorBody" };
  for (const s of errorStatuses(r)) {
    out[s] = { description: "Error",
      content: { "application/json": { schema: error } } };
  }
  return out;
}

function operationOf(r: RouteDef): Json {
  const op: Json = {
    operationId: r.id,
    security: r.auth === "public" ? [] : [{ bearer: [] }],
    parameters: parametersOf(r),
    responses: responsesOf(r),
  };
  if (r.body !== undefined) {
    op.requestBody = { required: true, content: { "application/json": {
      schema: schemaOrRef(r.body, "input") } } };
  }
  if (r.mfa) op["x-mfa-required"] = true;
  if (r.roles.length > 0) op["x-roles"] = [...r.roles];
  return op;
}

function components(): Json {
  const out: Json = {};
  for (const [name, s] of Object.entries(SCHEMAS)) {
    out[name] = jsonSchema(s, "output");
  }
  return out;
}

export function buildOpenApi(): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of ROUTES) {
    paths[r.path] ??= {};
    paths[r.path]![r.method.toLowerCase()] = operationOf(r);
  }
  return {
    openapi: "3.1.0",
    info: { title: "HR and Payroll API", version: "0.1.0" },
    paths,
    components: {
      schemas: components(),
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
    },
  };
}
