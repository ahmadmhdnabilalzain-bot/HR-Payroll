import {
  ApiErrorBody,
  ERROR_CODES,
  ROUTES,
} from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { recorder, runFlow, type Hit } from "./helpers/api-flow";
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
    const want = ROUTES.map((r) =>
      `${r.method} ${r.path.replace(/\{([a-zA-Z]+)\}/g, ":$1")}`);
    expect([...routes].sort()).toEqual([...want].sort());
  });

  it("one happy-path call per route parses with its response schema",
    () => {
      for (const r of ROUTES) {
        const ok = hits.find((h) => h.id === r.id && h.res.status < 300);
        expect(ok, `${r.id} never succeeded`).toBeDefined();
        const body = r.status === 204 ? null : ok!.res.body;
        const parsed = r.response.safeParse(body);
        expect(parsed.success, `${r.id}: ${parsed.error?.message}`)
          .toBe(true);
      }
    });

  it("binary and csv-optional routes answer their media types", () => {
    const bin = hits.find((h) => h.id === "downloadReceipt")!;
    expect(bin.res.headers.get("content-type")).toBe("image/png");
    expect(bin.res.headers.get("content-disposition"))
      .toMatch(/^attachment; filename="receipt-[0-9a-f-]{36}\.png"$/);
    const csv = ROUTES.filter((r) => r.contentType === "text/csv-optional");
    for (const r of csv) {
      const types = hits.filter((h) => h.id === r.id && h.res.status < 300)
        .map((h) => h.res.headers.get("content-type") ?? "");
      expect(types.some((t) => t.startsWith("text/csv")), r.id).toBe(true);
      expect(types.some((t) => t.startsWith("application/json")), r.id)
        .toBe(true);
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
