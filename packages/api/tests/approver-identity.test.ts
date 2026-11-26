import { describe, expect, it } from "vitest";
import { meal, submitted } from "./helpers/expense-fixtures";
import { rowsOf } from "./helpers/channel-jobs";
import { as, world, type World } from "./helpers/reimb-world";
import {
  approvalOf,
  auditActions,
  postHook,
  waUser,
  waWorld,
} from "./helpers/wa-world";

/**
 * Who may approve after the merge with Plan 6's hardened spine: a role
 * step needs the role at decision time, also through WhatsApp, and an
 * API key's service user (role hr) is never an approver.
 */
const CHAIN = "/v1/approval-chains/expense-claim";
const HR_TIER = { approver: { kind: "role", role: "hr" }, minTotal: "0.00" };
const H_PHONE = "+971500000021";

async function setChain(w: Pick<World, "ctx" | "s">, tiers: unknown[]) {
  const cur = await as(w as World, w.s.owner, "GET", "/v1/approval-chains");
  const chain = cur.body.items.find((x: { subjectType: string }) =>
    x.subjectType === "expense-claim");
  return as(w as World, w.s.owner, "PUT", CHAIN, { tiers,
    overLimitApprover: "owner", expectedVersion: chain?.version ?? 0 });
}

async function newKey(w: World) {
  const r = await as(w, w.s.owner, "POST", "/v1/api-keys",
    { name: "Sync", scopes: ["employees:read", "expenses:read"] });
  expect(r.status, r.text).toBe(201);
  const [row] = await rowsOf<{ service_user_id: string }>(w.ctx,
    w.s.companyId, "SELECT service_user_id FROM api_keys");
  return { secret: r.body.secret as string, userId: row!.service_user_id };
}

describe("approver identity at decision time", () => {
  it("a demoted approver tapping approve in WhatsApp gets NOT_AN_APPROVER",
    async () => {
      const w = await waWorld("wdemote");
      expect((await setChain(w, [HR_TIER])).status).toBe(200);
      await waUser(w.ctx, w.s, w.s.hr, H_PHONE);
      const id = await w.claim("45.00");
      const [approve] = w.buttons(H_PHONE);
      const id2 = await w.claim("47.00");
      const [, reject] = w.buttons(H_PHONE);
      const d = await as(w as unknown as World, w.s.owner, "PATCH",
        `/v1/users/${w.s.hr.userId}`, { role: "employee" });
      expect(d.status, d.text).toBe(200);
      const res = await postHook(w.ctx,
        [{ id: "d1", from: H_PHONE, payload: approve! }]);
      expect(res.status).toBe(200);
      // A reject tap is refused at once (no reason prompt first).
      await postHook(w.ctx, [{ id: "d2", from: H_PHONE, payload: reject! }]);
      for (const x of [id, id2]) {
        const v = await approvalOf(w.ctx, w.s, x);
        expect(v.status).toBe("pending");
        expect(v.steps[0]!.decidedBy).toBeNull();
      }
      const refused = (await auditActions(w.ctx, w.s)).filter((a) =>
        a.action === "whatsapp.action-refused");
      expect(refused.map((a) => a.data)).toEqual([
        { errorCode: "NOT_AN_APPROVER" }, { errorCode: "NOT_AN_APPROVER" }]);
      const no = "This decision cannot be made from WhatsApp. Open the app.";
      expect(w.replies(H_PHONE)).toEqual([no, no]);
    });

  it("service user (API key) is never an approver", async () => {
    const w = await world("svcappr");
    const key = await newKey(w);
    expect((await setChain(w, [HR_TIER])).status).toBe(200);
    const c = await submitted(w.ctx, w.s.employee, w.s,
      [meal(w.cats, "46.00")]);
    const [step] = await rowsOf<{ eligible: string[] }>(w.ctx,
      w.s.companyId, `SELECT array_to_json(eligible) AS eligible
        FROM approval_steps WHERE request_id = $1`, [c.approval.id]);
    expect(step!.eligible).toContain(w.s.hr.userId);
    expect(step!.eligible).not.toContain(key.userId);
    const viaKey = (method: string, path: string, body?: unknown) =>
      w.ctx.app.request(path, { method, headers: {
        authorization: `Bearer ${key.secret}`, "x-company-id": w.s.companyId,
        "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const approve = await viaKey("POST",
      `/v1/approvals/${c.approval.id}/approve`, { stepOrder: 1 });
    expect(approve.status).toBe(403);
    expect(await approve.text()).toContain("API_KEY_ROUTE_NOT_ALLOWED");
    expect((await viaKey("GET", "/v1/approvals/inbox")).status).toBe(403);
    const named = await setChain(w, [{ approver: { kind: "user",
      userId: key.userId }, minTotal: "0.00" }]);
    expect(named.status).toBe(422);
    expect(named.text).toContain("tiers.0.approver.userId");
    expect((await approvalOf(w.ctx, w.s, c.approval.id)).status)
      .toBe("pending");
  });
});
