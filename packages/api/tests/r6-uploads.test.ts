import { describe, expect, it } from "vitest";
import { FILE_QUOTA } from "../src/files/quota";
import { seedCompany } from "./helpers/seed";
import { call, fakePdf, makeApp } from "./helpers/test-app";

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");

/** Review I-6 (pglite part): body before transaction, upload quota. */
describe("uploads", () => {
  it("a stalled upload body holds no transaction", async () => {
    const ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    const s = await seedCompany(ctx, "r6a");
    const json = JSON.stringify({ name: "a.pdf",
      contentBase64: b64(fakePdf("slow")) });
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const body = new ReadableStream<Uint8Array>({
      async start(ctl) {
        ctl.enqueue(new TextEncoder().encode(json.slice(0, 10)));
        await gate;
        ctl.enqueue(new TextEncoder().encode(json.slice(10)));
        ctl.close();
      } });
    const up = ctx.app.request("/v1/files", { method: "POST", body,
      duplex: "half", headers: { authorization: `Bearer ${s.hr.token}`,
        "x-company-id": s.companyId, "content-type": "application/json",
        "content-length": String(json.length) } } as RequestInit);
    await new Promise((r) => setTimeout(r, 100));
    // pglite runs one transaction at a time: this answers only if the
    // stalled upload holds none.
    const other = await Promise.race([
      call(ctx.app, s.owner.token, s.companyId, "GET", "/v1/employees")
        .then((r) => r.status),
      new Promise((r) => setTimeout(() => r("blocked"), 3000))]);
    release();
    expect(other).toBe(200);
    expect((await up).status).toBe(201);
  });

  it("each user has a daily upload quota", async () => {
    const ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    const s = await seedCompany(ctx, "r6b");
    const post = () => call(ctx.app, s.employee.token, s.companyId, "POST",
      "/v1/files", { name: "q.pdf", contentBase64: b64(fakePdf("q")) });
    for (let i = 0; i < FILE_QUOTA.perUserPerDay; i++) {
      expect((await post()).status).toBe(201);
    }
    const over = await post();
    expect([over.status, over.body.error.code])
      .toEqual([429, "FILE_QUOTA_EXCEEDED"]);
    expect((await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/files", { name: "q.pdf", contentBase64: b64(fakePdf("h")) }))
      .status).toBe(201);
  });
});
