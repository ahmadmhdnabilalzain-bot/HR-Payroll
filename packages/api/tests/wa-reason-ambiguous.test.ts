import { REPLY_TEXTS } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { approvalOf, M_PHONE, postHook, waWorld } from "./helpers/wa-world";

/**
 * Review M8: two rejects tapped within the reason window; the typed
 * reason goes to neither, both wait for a new tap, and the approver is
 * told why.
 */
describe("a typed reason with two rejects waiting", () => {
  it("is recorded for neither and asks the approver to tap again",
    async () => {
      const w = await waWorld("wareason");
      const a = await w.claim("55.00");
      const [, ra] = w.buttons();
      const b = await w.claim("56.00");
      const [, rb] = w.buttons();
      await postHook(w.ctx, [{ id: "x1", from: M_PHONE, payload: ra! }]);
      await postHook(w.ctx, [{ id: "x2", from: M_PHONE, payload: rb! }]);
      await postHook(w.ctx, [{ id: "x3", from: M_PHONE,
        text: "Not a business expense" }]);
      for (const id of [a, b]) {
        expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
      }
      expect(w.replies().at(-1)).toBe(REPLY_TEXTS.ambiguous.en);
      // The waiting rejects are gone: a later text does nothing.
      const n = w.replies().length;
      await postHook(w.ctx, [{ id: "x4", from: M_PHONE,
        text: "Not a business expense" }]);
      expect(w.replies().length).toBe(n);
      for (const id of [a, b]) {
        expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
      }
    });
});
