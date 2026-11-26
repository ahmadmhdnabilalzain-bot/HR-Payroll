import { describe, expect, it } from "vitest";
import { approvalOf, M_PHONE, postHook, waWorld } from "./helpers/wa-world";

const PROMPT = "Reply with the reason for rejecting (3 to 500 characters) " +
  "within 10 minutes, or open the app.";
const text = (id: string, body: string) =>
  [{ id, from: M_PHONE, text: body }];

describe("reject from WhatsApp needs a typed reason", () => {
  it("reject_needs_reason", async () => {
    const w = await waWorld("wra");
    const id = await w.claim();
    const [, tr] = w.buttons();
    await postHook(w.ctx, [{ id: "r1", from: M_PHONE, payload: tr! }]);
    expect(w.replies()).toEqual([PROMPT]);
    await postHook(w.ctx, text("r2", "ok"));
    expect(w.replies()).toEqual([PROMPT, PROMPT]);
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
    await postHook(w.ctx, text("r3", "  missing receipt "));
    const v = await approvalOf(w.ctx, w.s, id);
    expect(v.status).toBe("rejected");
    expect(v.steps[0]).toMatchObject({ note: "missing receipt",
      decidedBy: w.s.manager.userId });
    expect(w.replies().at(-1)).toBe(
      "Rejected. Your reason was saved with the decision.");
  });

  it("reject_window_expires", async () => {
    const w = await waWorld("wrb");
    const id = await w.claim();
    const [, tr] = w.buttons();
    await postHook(w.ctx, [{ id: "r1", from: M_PHONE, payload: tr! }]);
    w.ctx.clock.advance(10 * 60_000 + 1000);
    await postHook(w.ctx, text("r2", "missing receipt"));
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
    expect(w.replies()).toEqual([PROMPT]);
  });

  it("reject_after_reject_tap_approve_dead", async () => {
    const w = await waWorld("wrc");
    const id = await w.claim();
    const [ta, tr] = w.buttons();
    await postHook(w.ctx, [{ id: "r1", from: M_PHONE, payload: tr! }]);
    await postHook(w.ctx, [{ id: "r2", from: M_PHONE, payload: ta! }]);
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
  });

  it("text_without_pending_reason_ignored", async () => {
    const w = await waWorld("wrd");
    const id = await w.claim();
    await postHook(w.ctx, text("t1", "hello there"));
    expect(w.replies()).toEqual([]);
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
  });
});
