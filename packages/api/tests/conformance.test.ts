import {
  ApiErrorBody,
  DOCUMENT_ROUTES,
  ERROR_CODES,
  ROUTES,
} from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { recorder, runFlow, type Hit } from "./helpers/api-flow";
import { isPending, PLAN7_PENDING } from "./helpers/plan7-pending";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("whole-API conformance", () => {
  let ctx: Ctx;
  const hits: Hit[] = [];

  beforeAll(async () => {
    ctx = await makeApp();
    await runFlow(ctx, recorder(ctx, hits));
  });

  it("registers every ROUTES id exactly once and nothing else", () => {
    const routes = (ctx.app.routes as { method: string; path: string }[])
      .filter((r) => r.method !== "ALL")
      .map((r) => `${r.method} ${r.path}`);
    const key = (r: { method: string; path: string }) =>
      `${r.method} ${r.path.replace(/\{([a-zA-Z]+)\}/g, ":$1")}`;
    const all = ROUTES.map(key);
    const want = ROUTES.filter((r) => !isPending(r.id)).map(key);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.filter((r) => !all.includes(r))).toEqual([]);
    expect(want.filter((w) => !routes.includes(w))).toEqual([]);
  });

  it("one happy-path call per route parses with its response schema",
    () => {
      for (const r of ROUTES.filter((x) => !isPending(x.id))) {
        const ok = hits.find((h) => h.id === r.id && h.res.status < 300);
        expect(ok, `${r.id} never succeeded`).toBeDefined();
        const body = r.status === 204 ? null : ok!.res.body;
        const parsed = r.response.safeParse(body);
        expect(parsed.success, `${r.id}: ${parsed.error?.message}`)
          .toBe(true);
      }
    });

  it("every Plan 7 route is served (none pending)", () => {
    expect([...PLAN7_PENDING]).toEqual([]);
  });

  it("Plan 7 downloads send their stored type as an attachment", () => {
    const types = ["application/pdf", "image/png", "image/jpeg"];
    for (const r of DOCUMENT_ROUTES.filter((x) =>
      x.contentType === "binary")) {
      const ok = hits.find((h) => h.id === r.id && h.res.status === 200);
      expect(types, r.id).toContain(ok!.res.headers.get("content-type"));
      expect(ok!.res.headers.get("content-disposition"), r.id)
        .toMatch(/^attachment;/);
    }
  });

  it("every error body parses and carries a known code", () => {
    const errors = hits.filter((h) => h.res.status >= 400);
    expect(errors.length).toBeGreaterThan(2);
    for (const h of errors) {
      const b = ApiErrorBody.parse(h.res.body);
      expect(ERROR_CODES).toContain(b.error.code);
    }
  });
});
