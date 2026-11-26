import { describe, expect, it } from "vitest";
import { channelApprovable } from "../src/whatsapp/actions";
import { signAction, verifyAction } from "../src/whatsapp/token";
import { enableWhatsApp, optIn } from "./helpers/channel-jobs";
import { fakeChannels } from "./helpers/fake-channels";
import { seedCompany } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";
import {
  approvalOf,
  auditActions,
  E_PHONE,
  M_PHONE,
  postHook,
  waUser,
  waWorld,
} from "./helpers/wa-world";

const tap = (id: string, from: string, payload: string) =>
  [{ id, from, payload }];

describe("WhatsApp approvals", () => {
  it("wa_message_has_buttons and wa_approve_once", async () => {
    const w = await waWorld("waa");
    const id = await w.claim("40.00");
    const sent = w.ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE && "templateName" in m).at(-1) as {
      templateName: string; bodyParams: string[] };
    expect(sent.templateName).toBe("approval_pending_actions_v1");
    expect(sent.bodyParams).toEqual(["Person 2", "expense claim"]);
    expect(JSON.stringify(sent)).not.toContain("40.00");
    const key = w.ctx.deps.keyring.derive("payroll/wa-action/v1");
    const now = Math.floor(w.ctx.clock.now.getTime() / 1000);
    const [ta, tr] = w.buttons();
    expect(verifyAction(key, ta!, now)).toMatchObject({ decision: "a" });
    expect(verifyAction(key, tr!, now)).toMatchObject({ decision: "r" });
    expect((await postHook(w.ctx, tap("m1", M_PHONE, ta!))).status)
      .toBe(200);
    const v = await approvalOf(w.ctx, w.s, id);
    expect(v.status).toBe("approved");
    expect(v.steps[0]!.decidedBy).toBe(w.s.manager.userId);
    const acts = (await auditActions(w.ctx, w.s)).map((a) => a.action);
    expect(acts).toContain("approval.step-approved");
    expect(acts).toContain("whatsapp.action-used");
    expect(w.replies()).toEqual(["Approved. Thank you."]);
  });

  it("wa_action_once_and_spine_rules: replay, race, wrong phone",
    async () => {
      const w = await waWorld("wab");
      const id = await w.claim();
      const [ta] = w.buttons();
      await postHook(w.ctx, tap("m1", M_PHONE, ta!));
      await postHook(w.ctx, tap("m1", M_PHONE, ta!));
      expect(w.replies()).toEqual(["Approved. Thank you."]);
      const id2 = await w.claim("41.00");
      const [tb] = w.buttons();
      await Promise.all([postHook(w.ctx, tap("r1", M_PHONE, tb!)),
        postHook(w.ctx, tap("r2", M_PHONE, tb!))]);
      const v2 = await approvalOf(w.ctx, w.s, id2);
      expect(v2.status).toBe("approved");
      expect(v2.steps.filter((x) => x.decidedBy !== null).length).toBe(1);
      const id3 = await w.claim("42.00");
      const [tc] = w.buttons();
      const before = w.replies().length;
      await postHook(w.ctx, tap("e1", E_PHONE, tc!));
      expect((await approvalOf(w.ctx, w.s, id3)).status).toBe("pending");
      expect(w.replies().length).toBe(before);
      expect(w.ctx.fakes.outbox.whatsapp.some((m) => m.toE164 === E_PHONE))
        .toBe(false);
      expect((await approvalOf(w.ctx, w.s, id)).status).toBe("approved");
    });

  it("wa_action_once_and_spine_rules: app first, withdrawn, forged",
    async () => {
      const w = await waWorld("wac");
      const id = await w.claim();
      const [ta] = w.buttons();
      await call(w.ctx.app, w.s.manager.token, w.s.companyId, "POST",
        `/v1/approvals/${id}/approve`, { stepOrder: 1 });
      await postHook(w.ctx, tap("s1", M_PHONE, ta!));
      expect(w.replies()).toEqual([
        "This request has changed or was already decided. Open the app " +
        "to see it."]);
      const id2 = await w.claim("43.00");
      const [tb] = w.buttons();
      const key = new Uint8Array(32).fill(9);
      const forged = signAction(key, { companyId: w.s.companyId,
        actionId: "00000000-0000-4000-8000-000000000001", decision: "a",
        expiresAt: 4_000_000_000 });
      await postHook(w.ctx, tap("f1", M_PHONE, forged));
      w.ctx.clock.advance(49 * 3600_000);
      await postHook(w.ctx, tap("x1", M_PHONE, tb!));
      expect((await approvalOf(w.ctx, w.s, id2)).status).toBe("pending");
      expect(w.replies().length).toBe(1);
      w.ctx.clock.advance(-49 * 3600_000);
      await call(w.ctx.app, w.s.manager.token, w.s.companyId, "POST",
        "/v1/me/channels/whatsapp/withdraw");
      await postHook(w.ctx, tap("w1", M_PHONE, tb!));
      expect((await approvalOf(w.ctx, w.s, id2)).status).toBe("pending");
      expect(w.replies().length).toBe(1);
    });

  it("wa_action_once_and_spine_rules: APPROVER_NEEDED_LATER", async () => {
    const w = await waWorld("wad");
    const { ctx, s } = w;
    await waUser(ctx, s, s.owner, "+971500000011");
    const cur = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/approval-chains");
    const chain = cur.body.items.find((x: { subjectType: string }) =>
      x.subjectType === "expense-claim");
    const r = await call(ctx.app, s.owner.token, s.companyId, "PUT",
      "/v1/approval-chains/expense-claim", { tiers: [
        { approver: { kind: "role", role: "owner" }, minTotal: "0.00" },
        { approver: { kind: "user", userId: s.owner.userId },
          minTotal: "0.00" }], overLimitApprover: "owner",
      expectedVersion: chain?.version ?? 0 });
    expect(r.status, r.text).toBe(200);
    const { addOwner } = await import("./helpers/seed");
    await addOwner(ctx, s);
    const id = await w.claim("44.00");
    const [ta] = w.buttons("+971500000011");
    await postHook(ctx, tap("n1", "+971500000011", ta!));
    expect((await approvalOf(ctx, s, id)).status).toBe("pending");
    const refused = (await auditActions(ctx, s)).find((a) =>
      a.action === "whatsapp.action-refused");
    expect(refused?.data).toEqual({ errorCode: "APPROVER_NEEDED_LATER" });
  });

  it("wa_not_approvable_subject and wa_approvals_switch_off", async () => {
    expect(channelApprovable("expense-claim")).toBe(true);
    expect(channelApprovable("expense-claim", [])).toBe(false);
    const w = await waWorld("wae", false);
    await w.claim();
    const sent = w.ctx.fakes.outbox.whatsapp.filter((m) =>
      m.toE164 === M_PHONE && "templateName" in m).at(-1) as {
      templateName: string; buttonPayloads: string[] };
    expect(sent.templateName).toBe("approval_pending_v1");
    expect(sent.buttonPayloads).toEqual([]);
  });

  it("a tap after approvals were switched off is refused", async () => {
    const w = await waWorld("wah");
    const id = await w.claim();
    const [ta] = w.buttons();
    await enableWhatsApp(w.ctx, w.s, { whatsappApprovals: false });
    await postHook(w.ctx, tap("o1", M_PHONE, ta!));
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
    expect(w.replies()).toEqual(
      ["This decision cannot be made from WhatsApp. Open the app."]);
  });

  it("wa_bad_signature and wa_verify_challenge", async () => {
    const w = await waWorld("waf");
    const id = await w.claim();
    const [ta] = w.buttons();
    const bad = await postHook(w.ctx, tap("b1", M_PHONE, ta!), "other");
    expect(bad.status).toBe(401);
    expect(bad.text).toContain("HOOK_SIGNATURE_INVALID");
    expect((await approvalOf(w.ctx, w.s, id)).status).toBe("pending");
    const q = (t: string) => w.ctx.app.request("/v1/hooks/whatsapp?" +
      `hub.mode=subscribe&hub.verify_token=${t}&hub.challenge=12345`);
    const ok = await q("test-verify-token");
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("12345");
    expect((await q("wrong")).status).toBe(403);
    const off = await makeApp({ channels: fakeChannels(
      { whatsappInbound: false }) });
    const r = await off.app.request("/v1/hooks/whatsapp", { method: "POST",
      body: "{}" });
    expect(r.status).toBe(503);
  });

  it("wa_stop_withdraws_everywhere and wa_audit_has_no_phone_or_token",
    async () => {
      const w = await waWorld("wag");
      const b = await seedCompany(w.ctx, "wagb");
      await enableWhatsApp(w.ctx, b);
      const id = await w.claim();
      const [ta] = w.buttons();
      await postHook(w.ctx, tap("t1", M_PHONE, ta!));
      // A second person verifying the number ends A's opt-in already
      // (review I2); STOP then ends B's.
      await optIn(w.ctx, b, b.manager, M_PHONE);
      await postHook(w.ctx, [{ id: "t2", from: M_PHONE, text: " stop " }]);
      for (const [s, u] of [[w.s, w.s.manager], [b, b.manager]] as const) {
        const me = await call(w.ctx.app, u.token, s.companyId, "GET",
          "/v1/me/channels");
        expect(me.body.whatsapp.status).toBe("withdrawn");
      }
      expect(w.replies().at(-1)).toContain("no more WhatsApp messages");
      const audit = JSON.stringify(await auditActions(w.ctx, w.s));
      expect(audit).not.toContain("500000002");
      expect(audit).not.toContain(ta!.split(".").at(-1)!);
      expect(audit).not.toContain("wa1.");
      expect((await approvalOf(w.ctx, w.s, id)).status).toBe("approved");
    });
});
