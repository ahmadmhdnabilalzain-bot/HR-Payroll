import { describe, expect, it } from "vitest";
import type { MemoryBlobStore } from "../src/storage/blob";
import { rowsOf } from "./helpers/channel-jobs";
import {
  HTML,
  inWorld,
  PDF,
  PNG,
  postInbound,
  postmarkPayload,
  SARA,
} from "./helpers/email-in";
import { fakeChannels } from "./helpers/fake-channels";
import { call, makeApp } from "./helpers/test-app";

describe("email-in intake", () => {
  it("email_in_happy_path", async () => {
    const w = await inWorld("eia");
    const r = await postInbound(w.ctx, postmarkPayload({ from: SARA,
      hash: w.hash, atts: [{ name: "taxi.png", type: "image/png",
        bytes: PNG }] }));
    expect(r.status, r.text).toBe(200);
    const [item] = await w.items();
    expect(item).toMatchObject({ status: "received", fromAddress: SARA,
      matchedEmployee: { employeeId: w.s.emp.report, name: "Person 2" },
      flags: [] });
    expect(item.attachments).toEqual([expect.objectContaining({
      index: 0, status: "kept", contentType: "image/png" })]);
    for (const u of [w.s.owner, w.s.hr]) {
      const n = await call(w.ctx.app, u.token, w.s.companyId, "GET",
        "/v1/me/notifications");
      expect(n.body.items.map((x: { kind: string }) => x.kind))
        .toContain("inbound-received");
    }
    const audit = await call(w.ctx.app, w.s.owner.token, w.s.companyId,
      "GET", "/v1/audit-events?limit=200");
    const ev = audit.body.items.find((e: { action: string }) =>
      e.action === "inbound.received");
    expect(ev.data).toEqual({ attachmentCount: 1, keptCount: 1,
      flags: [] });
    expect(audit.text).not.toContain(SARA);
    expect(audit.text).not.toContain("Taxi receipt");
  });

  it("email_in_spoof_retry_and_review", async () => {
    const w = await inWorld("eib");
    await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
      id: "spoof", spf: "fail", atts: [{ name: "x.png", type: "image/png",
        bytes: PNG }] }));
    const [spoof] = await w.items();
    expect(spoof).toMatchObject({ status: "rejected",
      rejectReason: "SENDER_AUTH_FAILED", fromAddress: null,
      attachments: [] });
    expect((w.ctx.deps.blobs as MemoryBlobStore).dump().size).toBe(0);
    const p = postmarkPayload({ from: SARA, hash: w.hash, id: "types",
      atts: [{ name: "a.pdf", type: "application/pdf", bytes: HTML },
        { name: "b.png", type: "image/png", bytes: PDF }] });
    await postInbound(w.ctx, p);
    await postInbound(w.ctx, p);
    const items = await w.items();
    expect(items.length).toBe(2);
    expect(items[0].attachments.map((a: { skip: string }) => a.skip))
      .toEqual(["TYPE_NOT_ALLOWED", "TYPE_MISMATCH"]);
    expect(items[0].flags).toEqual(["ATTACHMENT_SKIPPED"]);
    const claims = await rowsOf(w.ctx, w.s.companyId,
      "SELECT 1 FROM expense_claims");
    const receipts = await rowsOf(w.ctx, w.s.companyId,
      "SELECT 1 FROM receipts");
    expect([claims.length, receipts.length]).toEqual([0, 0]);
  });

  it("email_in_unknown_sender and a spoof with the attacker's own auth",
    async () => {
      const w = await inWorld("eic");
      await postInbound(w.ctx, postmarkPayload({ from: "x@else.test",
        hash: w.hash, id: "u1" }));
      const [u] = await w.items();
      expect(u).toMatchObject({ status: "rejected",
        rejectReason: "SENDER_NOT_ALLOWED", fromAddress: null,
        subject: "", textPreview: "" });
      await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
        id: "u2", domain: "attacker.test" }));
      const [flagged] = await w.items();
      expect(flagged.flags).toEqual(["SENDER_UNVERIFIED"]);
    });

  it("email_in_refusals", async () => {
    const w = await inWorld("eid");
    const good = postmarkPayload({ from: SARA, hash: w.hash, id: "r1" });
    expect((await postInbound(w.ctx, good, "hook:wrong")).status).toBe(401);
    const wrongSecret = w.hash.slice(0, 33) + "aaaaaaaaaaaaaaaa";
    const r = await postInbound(w.ctx, { ...good, MailboxHash: wrongSecret });
    expect(r.status).toBe(403);
    expect(r.text).toContain("INBOUND_REFUSED");
    expect(await w.items()).toEqual([]);
    const rot = await call(w.ctx.app, w.s.owner.token, w.s.companyId, "POST",
      "/v1/inbound/address/rotate");
    expect(rot.status, rot.text).toBe(200);
    expect((await postInbound(w.ctx, good)).status).toBe(403);
    const bad = await postInbound(w.ctx, null, undefined, "{not json");
    expect(bad.status).toBe(403);
    expect(bad.text).toContain("INBOUND_PAYLOAD_INVALID");
    const off = await makeApp({ channels: fakeChannels(
      { inboundEmail: false }) });
    expect((await postInbound(off, good)).status).toBe(503);
  });

  it("email_in_disabled and email_in_rate_limit", async () => {
    const w = await inWorld("eie");
    const cur = await call(w.ctx.app, w.s.hr.token, w.s.companyId, "GET",
      "/v1/inbound/settings");
    const need = await call(w.ctx.app, w.s.owner.token, w.s.companyId,
      "PUT", "/v1/inbound/settings", { enabled: true, allowlist: [],
        acknowledgedProcessing: false, expectedVersion: cur.body.version });
    expect(need.status).toBe(400);
    expect(need.body.error.detail.fields)
      .toContain("body.acknowledgedProcessing");
    await call(w.ctx.app, w.s.owner.token, w.s.companyId, "PUT",
      "/v1/inbound/settings", { enabled: false, allowlist: [],
        acknowledgedProcessing: true, expectedVersion: cur.body.version });
    await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
      id: "d1" }));
    expect((await w.items())[0]).toMatchObject({ status: "rejected",
      rejectReason: "DISABLED" });
    await rowsOf(w.ctx, w.s.companyId, `INSERT INTO rate_counters
      (company_id, scope, key, window_start, count)
      SELECT $1, 'inbound', 'all', floor((extract(epoch FROM $2::timestamptz)
        + 14400) / 86400) * 86400, 200`, [w.s.companyId,
      w.ctx.clock.now.toISOString()]);
    const cur2 = await call(w.ctx.app, w.s.hr.token, w.s.companyId, "GET",
      "/v1/inbound/settings");
    await call(w.ctx.app, w.s.owner.token, w.s.companyId, "PUT",
      "/v1/inbound/settings", { enabled: true, allowlist: [],
        acknowledgedProcessing: true, expectedVersion: cur2.body.version });
    await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
      id: "d2" }));
    expect((await w.items())[0].rejectReason).toBe("RATE_LIMITED");
  });

  it("email_in_eleven_attachments and email_in_cross_tenant", async () => {
    const w = await inWorld("eif");
    const atts = Array.from({ length: 11 }, (_, i) => ({
      name: `r${i}.png`, type: "image/png", bytes: PNG }));
    await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
      atts }));
    const [item] = await w.items();
    expect(item.attachments[10]).toMatchObject({ status: "skipped",
      skip: "TOO_MANY" });
    const b = await inWorld("eifb", w.ctx);
    const mixed = `${b.hash.slice(0, 32)}${w.hash.slice(32)}`;
    const r = await postInbound(w.ctx, postmarkPayload({ from: SARA,
      hash: mixed, id: "x1" }));
    expect(r.status).toBe(403);
    const peek = await call(w.ctx.app, b.s.owner.token, b.s.companyId,
      "GET", `/v1/inbound/items/${item.id}`);
    expect(peek.status).toBe(404);
  });
});
