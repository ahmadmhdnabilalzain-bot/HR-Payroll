import { z } from "zod";
import { SCHEMAS, schemaName } from "./registry";
import { ROUTES, type RouteDef } from "./routes";
import { API_KEY_SCOPES } from "./api-keys";
import { WEBHOOK_EVENT_TYPES, WEBHOOK_SIGNATURE_NOTE } from "./webhooks";

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  webhooks: Record<string, unknown>;
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

const BINARY = { type: "string", format: "binary" };
const RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/** The success body's media types and schemas. */
function successContent(r: RouteDef): Json {
  if (r.contentType === "binary") {
    return Object.fromEntries(RECEIPT_TYPES.map((t) =>
      [t, { schema: BINARY }]));
  }
  const json = { schema: schemaOrRef(r.response, "output") };
  if (r.contentType === "text/csv-optional") {
    return { "application/json": json,
      "text/csv": { schema: { type: "string" } } };
  }
  return { [r.contentType ?? "application/json"]: json };
}

function responsesOf(r: RouteDef): Json {
  const out: Json = {};
  if (r.status === 204) out["204"] = { description: "No content" };
  else {
    out[String(r.status)] = { description: "Success",
      content: successContent(r) };
  }
  const error = { $ref: "#/components/schemas/ApiErrorBody" };
  for (const s of errorStatuses(r)) {
    out[s] = { description: "Error",
      content: { "application/json": { schema: error } } };
  }
  return out;
}

function operationOf(r: RouteDef): Json {
  const scope = API_KEY_SCOPES[r.id];
  const op: Json = {
    operationId: r.id,
    security: r.auth === "public" ? [] : scope === undefined
      ? [{ bearer: [] }] : [{ bearer: [] }, { apiKey: [] }],
    parameters: parametersOf(r),
    responses: responsesOf(r),
  };
  if (r.body !== undefined) {
    op.requestBody = { required: true, content: { "application/json": {
      schema: schemaOrRef(r.body, "input") } } };
  }
  if (r.mfa) op["x-mfa-required"] = true;
  if (r.roles.length > 0) op["x-roles"] = [...r.roles];
  if (scope !== undefined) op["x-api-key-scope"] = scope;
  return op;
}

function components(): Json {
  const out: Json = {};
  for (const [name, s] of Object.entries(SCHEMAS)) {
    out[name] = jsonSchema(s, "output");
  }
  return out;
}

const HOOK_HEADERS = ["X-Webhook-Id", "X-Webhook-Timestamp",
  "X-Webhook-Signature"].map((name) => ({ name, in: "header",
  required: true, schema: { type: "string" } }));

/** One entry per webhook event type (Task 10). */
function webhooks(): Json {
  return Object.fromEntries(WEBHOOK_EVENT_TYPES.map((t) => [t, { post: {
    description: WEBHOOK_SIGNATURE_NOTE, parameters: HOOK_HEADERS,
    requestBody: { required: true, content: { "application/json": {
      schema: { $ref: "#/components/schemas/WebhookEvent" } } } },
    responses: { "200": { description: "Received" } } } }]));
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
      securitySchemes: { bearer: { type: "http", scheme: "bearer" },
        apiKey: { type: "http", scheme: "bearer", description: "API key " +
          "(hrk_...). Send X-Company-Id with the key's company." } },
    },
    webhooks: webhooks(),
  };
}
