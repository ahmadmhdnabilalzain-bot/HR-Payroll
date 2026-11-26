import { describe, expect, it } from "vitest";
import { dispatch, rowsOf } from "./helpers/channel-jobs";
import { meal, submitted } from "./helpers/expense-fixtures";
import { FAKE_API_BASE } from "./helpers/fake-channels";
import { call } from "./helpers/test-app";
import {
  approvalOf,
  auditActions,
  M_PHONE,
  postHook,
  waWorld,
} from "./helpers/wa-world";

/**
 * Plan 8 revokes a leaver's membership (`revoked_at`). After the merge
 * with Plan 13 a revoked member cannot act through WhatsApp, hears of
 * nothing new, and their calendar feed URL stops answering.
 */
describe("a revoked member and the channels", () => {
  it("tap refused, no notices, feed 404", async () => {
    const w = await waWorld("revoked");
    const { ctx, s } = w;
    const feed = await call(ctx.app, s.manager.token, s.companyId, "POST",
      "/v1/me/calendar-feeds", { scope: "my" });
    expect(feed.status, feed.text).toBe(201);
    const path = feed.body.url.slice(FAKE_API_BASE.length);
    expect((await ctx.app.request(path)).status).toBe(200);
    const id = await w.claim("48.00");
    const [approve] = w.buttons();
    await rowsOf(ctx, s.companyId, `UPDATE memberships SET revoked_at = $2
      WHERE company_id = $1 AND user_id = $3 RETURNING user_id`,
    [s.companyId, ctx.clock.now.toISOString(), s.manager.userId]);
    const res = await postHook(ctx, [{ id: "rv1", from: M_PHONE,
      payload: approve! }]);
    expect(res.status).toBe(200);
    expect((await approvalOf(ctx, s, id)).status).toBe("pending");
    const refused = (await auditActions(ctx, s)).filter((a) =>
      a.action === "whatsapp.action-refused");
    expect(refused.map((a) => a.data))
      .toEqual([{ errorCode: "TENANT_FORBIDDEN" }]);
    const sentBefore = ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE).length;
    const mine = () => rowsOf(ctx, s.companyId,
      "SELECT id FROM notifications WHERE user_id = $1", [s.manager.userId]);
    const before = (await mine()).length;
    expect(before).toBeGreaterThan(0);
    await w.claim("49.00");
    await dispatch(ctx);
    expect(ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE).length).toBe(sentBefore);
    expect((await mine()).length).toBe(before);
    expect((await ctx.app.request(path)).status).toBe(404);
  });

  it("M5: notices queued before the revocation are dropped", async () => {
    const w = await waWorld("revokedq");
    const { ctx, s } = w;
    await submitted(ctx, s.employee, s, [meal(w.cats, "54.00")]);
    const queued = await rowsOf<{ id: string }>(ctx, s.companyId,
      `SELECT id FROM notification_deliveries WHERE user_id = $1
         AND status = 'queued'`, [s.manager.userId]);
    expect(queued.length).toBeGreaterThan(0);
    await rowsOf(ctx, s.companyId, `UPDATE memberships SET revoked_at = $2
      WHERE company_id = $1 AND user_id = $3 RETURNING user_id`,
    [s.companyId, ctx.clock.now.toISOString(), s.manager.userId]);
    const emails = ctx.fakes.outbox.email.length;
    const wa = ctx.fakes.outbox.whatsapp.length;
    await dispatch(ctx);
    const rows = await rowsOf<{ status: string; reason: string }>(ctx,
      s.companyId, `SELECT status, reason FROM notification_deliveries
        WHERE user_id = $1`, [s.manager.userId]);
    const mine = rows.filter((r) => r.reason === "not-a-member");
    expect(mine.length).toBe(queued.length);
    expect(ctx.fakes.outbox.email.length).toBe(emails);
    expect(ctx.fakes.outbox.whatsapp.length).toBe(wa);
  });
});
