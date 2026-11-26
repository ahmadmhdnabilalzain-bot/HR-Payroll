import { describe, expect, it } from "vitest";
import { limitRenders } from "../src/pdf/limit";
import type { PdfRenderer } from "../src/pdf/renderer";
import { CERT, letterWorld } from "./helpers/letter-world";
import { page } from "./helpers/letter-page";
import { textPdfRenderer } from "./helpers/text-pdf";

/** A renderer whose renders wait until `release()` is called. */
function gated(): PdfRenderer & { release(): void; started: number } {
  const waiting: (() => void)[] = [];
  const inner = textPdfRenderer();
  const r = {
    started: 0,
    release: () => { for (const w of waiting.splice(0)) w(); },
    render: async (p: Parameters<PdfRenderer["render"]>[0]) => {
      r.started++;
      await new Promise<void>((ok) => waiting.push(ok));
      return inner.render(p);
    },
    close: async () => undefined,
  };
  return r;
}

describe("render limits (review I-5)", () => {
  it("caps concurrent renders and answers busy when the queue is full",
    async () => {
      const g = gated();
      const pdf = limitRenders(g, { concurrent: 1, queue: 1,
        retryAfterSeconds: 7 });
      const a = pdf.render(page());
      const b = pdf.render(page());
      await expect(pdf.render(page())).rejects.toMatchObject({
        code: "PDF_RENDERER_BUSY", retryAfterSeconds: 7 });
      await new Promise((r) => setTimeout(r, 10));
      expect(g.started).toBe(1);
      g.release();
      await a;
      await new Promise((r) => setTimeout(r, 10));
      expect(g.started).toBe(2);
      g.release();
      await b;
    });

  it("renders outside the database transaction", async () => {
    let free: boolean | null = null;
    const w = await letterWorld("r5tx", { pdf: {
      render: async (p) => {
        // pglite runs one transaction at a time: this query can only
        // finish while no request transaction is open.
        free = await Promise.race([
          w.ctx.deps.db.query("SELECT 1").then(() => true),
          new Promise<boolean>((r) => setTimeout(() => r(false), 2000))]);
        return textPdfRenderer().render(p);
      },
      close: async () => undefined } });
    const r = await w.issue(w.s.hr, "noc", { ...CERT,
      employeeId: w.s.emp.report });
    expect(r.status, r.text).toBe(201);
    expect(free).toBe(true);
  });

  it("rate-limits previews per user with Retry-After", async () => {
    const w = await letterWorld("r5rate");
    const body = { templateId: w.tmpl("noc").id,
      employeeId: w.s.emp.report, ...CERT };
    let last = 0;
    let res = null as Awaited<ReturnType<typeof w.req>> | null;
    for (let i = 0; i < 25; i++) {
      res = await w.req(w.s.hr, "POST", "/v1/letters/preview", body);
      last = res.status;
      if (last !== 200) break;
    }
    expect(last).toBe(429);
    expect(res!.body.error.code).toBe("RATE_LIMITED");
    expect(Number(res!.headers.get("retry-after"))).toBeGreaterThan(0);
    w.ctx.clock.advance(61_000);
    expect((await w.req(w.s.hr, "POST", "/v1/letters/preview", body))
      .status).toBe(200);
  });
});
