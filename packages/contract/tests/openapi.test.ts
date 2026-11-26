import { describe, expect, it } from "vitest";
import { buildOpenApi, ROUTES } from "../src/index";

type Op = {
  operationId?: string;
  security?: unknown[];
  parameters?: { name: string; in: string }[];
  responses: Record<string, { content?: Record<string, unknown> }>;
};

const doc = buildOpenApi();

function operations(): [string, string, Op][] {
  return Object.entries(doc.paths).flatMap(([path, item]) =>
    Object.entries(item as Record<string, Op>).map(
      ([m, op]): [string, string, Op] => [m, path, op]));
}

function refs(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => refs(x, out));
  else if (v !== null && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (k === "$ref" && typeof x === "string") out.push(x);
      else refs(x, out);
    }
  }
  return out;
}

function resolve(ref: string): unknown {
  const parts = ref.replace(/^#\//, "").split("/");
  let at: unknown = doc;
  for (const p of parts) {
    if (at === null || typeof at !== "object") return undefined;
    at = (at as Record<string, unknown>)[p];
  }
  return at;
}

describe("buildOpenApi", () => {
  it("is OpenAPI 3.1.0", () => {
    expect(doc.openapi).toBe("3.1.0");
  });
  it("has one operation per route, each with operationId", () => {
    const ops = operations();
    expect(ops.length).toBe(ROUTES.length);
    const ids = ops.map(([, , op]) => op.operationId);
    expect(new Set(ids)).toEqual(new Set(ROUTES.map((r) => r.id)));
  });
  it("public operations have security: []", () => {
    for (const [, , op] of operations()) {
      const r = ROUTES.find((x) => x.id === op.operationId)!;
      if (r.auth === "public") expect(op.security).toEqual([]);
      else expect(op.security).toEqual([{ bearer: [] }]);
    }
  });
  it("tenant operations take the X-Company-Id header", () => {
    for (const [, , op] of operations()) {
      const r = ROUTES.find((x) => x.id === op.operationId)!;
      const has = (op.parameters ?? []).some((p) =>
        p.in === "header" && p.name === "X-Company-Id");
      expect(has, r.id).toBe(r.auth === "tenant");
    }
  });
  it("the SIF download has a text/plain 200 response", () => {
    const op = (doc.paths["/v1/sif-files/{id}/download"] as
      Record<string, Op>).get!;
    expect(op.responses["200"]?.content).toHaveProperty("text/plain");
  });
  it("serialises and every $ref resolves", () => {
    const text = JSON.stringify(doc);
    expect(text.length).toBeGreaterThan(1000);
    const all = refs(JSON.parse(text));
    expect(all.length).toBeGreaterThan(0);
    for (const ref of all) expect(resolve(ref), ref).toBeDefined();
  });
  it("error responses refer to ApiErrorBody", () => {
    const op = (doc.paths["/v1/me"] as Record<string, Op>).get!;
    expect(JSON.stringify(op.responses["401"])).toContain(
      "#/components/schemas/ApiErrorBody");
  });
  it("the receipt download lists the three receipt types", () => {
    const op = (doc.paths["/v1/receipts/{id}/content"] as
      Record<string, Op>).get!;
    expect(Object.keys(op.responses["200"]?.content ?? {}).sort())
      .toEqual(["application/pdf", "image/jpeg", "image/png"]);
  });
  it("csv-optional reports list JSON and CSV", () => {
    const op = (doc.paths["/v1/expense-reports/summary"] as
      Record<string, Op>).get!;
    expect(Object.keys(op.responses["200"]?.content ?? {}).sort())
      .toEqual(["application/json", "text/csv"]);
  });
  it("the letter download has a 200 response listing application/pdf",
    () => {
      const op = (doc.paths["/v1/letters/{id}/download"] as
        Record<string, Op>).get!;
      expect(op.responses["200"]?.content).toHaveProperty(
        "application/pdf");
    });
});
