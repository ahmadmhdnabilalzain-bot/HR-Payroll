import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { addMember } from "./helpers/seed-hr";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let mgr2: SeedUser;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

const auditText = async (action: string) => JSON.stringify(
  await withTenant(ctx.deps.db, { companyId: s.companyId, userId: null },
    (tx) => tx.query("SELECT data FROM audit_events WHERE action = $1",
      [action])));

const newReq = (u: SeedUser, extra: Record<string, unknown> = {}) =>
  by(u, "POST", "/v1/requisitions", { title: "Accountant", headcount: 1,
    ...extra });

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "reqs");
  mgr2 = await addMember(ctx, s, "mgr2.reqs@example.com", "manager");
});

describe("requisitions", () => {
  it("req_manager_creates_pending", async () => {
    const r = await newReq(s.manager);
    expect(r.status, r.text).toBe(201);
    expect(r.body.status).toBe("pending-approval");
    expect(r.body.hiringManagerUserId).toBe(s.manager.userId);
    const other = await newReq(s.manager,
      { hiringManagerUserId: mgr2.userId });
    expect(other.status).toBe(403);
  });

  it("req_manager_cannot_decide", async () => {
    const r = await newReq(s.manager);
    const p = `/v1/requisitions/${r.body.id}/decision`;
    const m = await by(s.manager, "POST", p, { approve: true });
    expect(m.status).toBe(403);
    expect(m.body.error.code).toBe("FORBIDDEN");
    const h = await newReq(s.hr, { hiringManagerUserId: s.manager.userId });
    const self = await by(s.hr, "POST",
      `/v1/requisitions/${h.body.id}/decision`, { approve: true });
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe("SOD_VIOLATION");
  });

  it("req_owner_approves_opens", async () => {
    const r = await newReq(s.manager);
    const d = await by(s.owner, "POST",
      `/v1/requisitions/${r.body.id}/decision`, { approve: true });
    expect(d.status, d.text).toBe(200);
    expect(d.body.status).toBe("open");
    expect(d.body.decidedBy).toBe(s.owner.userId);
    const again = await by(s.owner, "POST",
      `/v1/requisitions/${r.body.id}/decision`, { approve: true });
    expect(again.body.error.code).toBe("APPROVAL_NOT_PENDING");
  });

  it("req_reject_keeps_note", async () => {
    const r = await newReq(s.manager);
    const note = "No budget this quarter for this role";
    const d = await by(s.owner, "POST",
      `/v1/requisitions/${r.body.id}/decision`, { approve: false, note });
    expect(d.body.status).toBe("rejected");
    expect(d.body.decisionNote).toBe(note);
    expect(await auditText("requisition.rejected")).not.toContain(note);
  });

  it("req_manager_sees_own_only", async () => {
    const r = await newReq(s.hr, { hiringManagerUserId: mgr2.userId });
    expect(r.status, r.text).toBe(201);
    const l = await by(s.manager, "GET", "/v1/requisitions");
    expect(l.body.items.map((x: { id: string }) => x.id))
      .not.toContain(r.body.id);
    const g = await by(s.manager, "GET", `/v1/requisitions/${r.body.id}`);
    expect(g.status).toBe(404);
    const own = await by(mgr2, "GET", `/v1/requisitions/${r.body.id}`);
    expect(own.status).toBe(200);
  });

  it("req_employee_forbidden", async () => {
    expect((await by(s.employee, "GET", "/v1/requisitions")).status)
      .toBe(403);
    expect((await newReq(s.employee)).status).toBe(403);
  });

  it("req_close_cancelled", async () => {
    const r = await newReq(s.manager);
    await by(s.owner, "POST", `/v1/requisitions/${r.body.id}/decision`,
      { approve: true });
    const c = await by(s.manager, "POST",
      `/v1/requisitions/${r.body.id}/close`, { reason: "Role merged" });
    expect(c.status, c.text).toBe(200);
    expect(c.body.status).toBe("cancelled");
    const cand = await by(s.hr, "POST", "/v1/candidates",
      { fullName: "Late Applicant", source: "direct" });
    const a = await by(s.hr, "POST", "/v1/applications",
      { requisitionId: r.body.id, candidateId: cand.body.id });
    expect(a.status).toBe(409);
    expect(a.body.error.code).toBe("REQUISITION_NOT_OPEN");
    const twice = await by(s.hr, "POST",
      `/v1/requisitions/${r.body.id}/close`, { reason: "again" });
    expect(twice.body.error.code).toBe("REQUISITION_NOT_OPEN");
  });
});
