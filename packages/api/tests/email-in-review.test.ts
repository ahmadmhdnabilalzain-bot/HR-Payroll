import { describe, expect, it } from "vitest";
import { rowsOf } from "./helpers/channel-jobs";
import {
  inWorld,
  PNG,
  postInbound,
  postmarkPayload,
  SARA,
  type InWorld,
} from "./helpers/email-in";
import { call, callBytes } from "./helpers/test-app";

async function withItem(name: string): Promise<InWorld & { id: string }> {
  const w = await inWorld(name);
  await postInbound(w.ctx, postmarkPayload({ from: SARA, hash: w.hash,
    atts: [{ name: "taxi.png", type: "image/png", bytes: PNG },
      { name: "bad.png", type: "image/png", bytes: new Uint8Array(9) }] }));
  return { ...w, id: (await w.items())[0].id };
}

const act = (w: InWorld & { id: string }, what: string, body: unknown,
  token = w.s.hr.token) => call(w.ctx.app, token, w.s.companyId, "POST",
  `/v1/inbound/items/${w.id}/${what}`, body);

describe("email-in review", () => {
  it("accept_as_receipt", async () => {
    const w = await withItem("era");
    const r = await act(w, "accept", { as: "receipt",
      employeeId: w.s.emp.report, attachmentIndexes: [0] });
    expect(r.status, r.text).toBe(200);
    expect(r.body.status).toBe("accepted");
    expect(r.body.decision).toMatchObject({ as: "receipt", claimId: null });
    const rec = await call(w.ctx.app, w.s.hr.token, w.s.companyId, "GET",
      `/v1/receipts/${r.body.decision.receiptIds[0]}`);
    expect(rec.body.employeeId).toBe(w.s.emp.report);
    const audit = await call(w.ctx.app, w.s.owner.token, w.s.companyId,
      "GET", "/v1/audit-events?limit=200");
    expect(audit.body.items.find((e: { action: string }) =>
      e.action === "inbound.accepted").data).toEqual(
      { as: "receipt", receiptCount: 1 });
    expect((await act(w, "accept", { as: "receipt",
      employeeId: w.s.emp.report, attachmentIndexes: [0] })).status)
      .toBe(409);
  });

  it("accept_as_claim_draft", async () => {
    const w = await withItem("erb");
    const r = await act(w, "accept", { as: "claim-draft",
      employeeId: w.s.emp.report, attachmentIndexes: [0],
      title: "Taxi March" });
    expect(r.status, r.text).toBe(200);
    const claim = await call(w.ctx.app, w.s.hr.token, w.s.companyId, "GET",
      `/v1/expense-claims/${r.body.decision.claimId}`);
    expect(claim.body).toMatchObject({ status: "draft", title: "Taxi March",
      approval: null });
    expect(claim.body.items).toEqual([]);
    const reqs = await rowsOf(w.ctx, w.s.companyId,
      "SELECT 1 FROM approval_requests");
    expect(reqs).toEqual([]);
  });

  it("accept_skipped_attachment_refused and dismiss", async () => {
    const w = await withItem("erc");
    const r = await act(w, "accept", { as: "receipt",
      employeeId: w.s.emp.report, attachmentIndexes: [1] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("INBOUND_ATTACHMENT_NOT_KEPT");
    const d = await act(w, "dismiss", { reason: "spam" });
    expect(d.body.status).toBe("dismissed");
    expect((await act(w, "accept", { as: "receipt",
      employeeId: w.s.emp.report, attachmentIndexes: [0] })).status)
      .toBe(409);
  });

  it("review_roles and the download headers", async () => {
    const w = await withItem("erd");
    const paths: [string, string, unknown?][] = [
      ["GET", "/v1/inbound/settings"], ["GET", "/v1/inbound/items"],
      ["GET", `/v1/inbound/items/${w.id}`],
      ["GET", `/v1/inbound/items/${w.id}/attachments/0`],
      ["POST", `/v1/inbound/items/${w.id}/dismiss`, { reason: "spam" }]];
    for (const u of [w.s.manager, w.s.employee]) {
      for (const [m, p, b] of paths) {
        const r = await call(w.ctx.app, u.token, w.s.companyId, m, p, b);
        expect(r.status, `${m} ${p}`).toBe(403);
      }
    }
    const f = await callBytes(w.ctx.app, w.s.hr.token, w.s.companyId,
      `/v1/inbound/items/${w.id}/attachments/0`);
    expect(f.status).toBe(200);
    expect(f.bytes).toEqual(PNG);
    expect(f.headers.get("content-disposition")).toContain("attachment");
    expect(f.headers.get("x-content-type-options")).toBe("nosniff");
    const skipped = await callBytes(w.ctx.app, w.s.hr.token, w.s.companyId,
      `/v1/inbound/items/${w.id}/attachments/1`);
    expect(skipped.status).toBe(404);
  });

  it("inbound_at_rest_encrypted", async () => {
    const w = await withItem("ere");
    const text = JSON.stringify(await rowsOf(w.ctx, w.s.companyId,
      "SELECT * FROM inbound_items"));
    expect(text).not.toContain(SARA);
    expect(text).not.toContain("Taxi receipt");
  });
});
