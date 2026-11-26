import { describe, expect, it } from "vitest";
import { optIn } from "./helpers/channel-jobs";
import { call } from "./helpers/test-app";
import {
  approvalOf,
  auditActions,
  M_PHONE,
  postHook,
  waWorld,
} from "./helpers/wa-world";

/**
 * Security review I2: manager M is opted in on a number; HR user H
 * then proves control of the same number. M's opt-in ends, M's open
 * actions are void, and H's tap on M's button decides nothing.
 */
describe("a WhatsApp number that changes hands", () => {
  it("verifying the number withdraws the old holder", async () => {
    const w = await waWorld("warepl");
    const { ctx, s } = w;
    const id = await w.claim("52.00");
    const [approve] = w.buttons();
    await optIn(ctx, s, s.hr, M_PHONE);
    const me = await call(ctx.app, s.manager.token, s.companyId, "GET",
      "/v1/me/channels");
    expect(me.body.whatsapp.status).toBe("withdrawn");
    const hr = await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/me/channels");
    expect(hr.body.whatsapp.status).toBe("active");
    const res = await postHook(ctx, [{ id: "rp1", from: M_PHONE,
      payload: approve! }]);
    expect(res.status).toBe(200);
    const v = await approvalOf(ctx, s, id);
    expect(v.status).toBe("pending");
    expect(v.steps[0]!.decidedBy).toBeNull();
    const out = (await auditActions(ctx, s)).filter((a) =>
      a.action === "whatsapp.opted-out");
    expect(out.map((a) => a.data)).toEqual([{ via: "replaced" }]);
    const before = w.ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE && "buttonPayloads" in m &&
      m.buttonPayloads.length > 0).length;
    await w.claim("53.00");
    expect(w.ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE && "buttonPayloads" in m &&
      m.buttonPayloads.length > 0).length).toBe(before);
  });

  it("the same person keeps the number in another company", async () => {
    const w = await waWorld("warepl2");
    const { ctx, s } = w;
    const { seedCompany } = await import("./helpers/seed");
    const { enableWhatsApp } = await import("./helpers/channel-jobs");
    const b = await seedCompany(ctx, "warepl2b");
    await enableWhatsApp(ctx, b);
    await optIn(ctx, b, b.manager, "+971500000031");
    await optIn(ctx, b, b.hr, M_PHONE);
    const me = await call(ctx.app, s.manager.token, s.companyId, "GET",
      "/v1/me/channels");
    // Another person (b's hr) verified M's number: M loses it in A too.
    expect(me.body.whatsapp.status).toBe("withdrawn");
  });
});
