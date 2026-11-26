import { beforeAll, describe, expect, it } from "vitest";
import {
  claimAction,
  createClaim,
  EXPENSE_START,
  meal,
  setupExpenses,
  submitted,
  type Cats,
} from "./helpers/expense-fixtures";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, callBytes, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  9, 9, 9]).toString("base64");

describe("expense claims through the approval spine", () => {
  let ctx: Ctx;
  let s: Seeded;
  let cats: Cats;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const decide = (u: SeedUser, approvalId: string, action: string,
    note?: string) => as(u, "POST", `/v1/approvals/${approvalId}/${action}`,
    note === undefined ? { stepOrder: 1 } : { stepOrder: 1, note });
  const view = (u: SeedUser, id: string) =>
    as(u, "GET", `/v1/expense-claims/${id}`);
  beforeAll(async () => {
    ctx = await makeApp({ start: EXPENSE_START });
    s = await seedCompany(ctx, "flow");
    cats = await setupExpenses(ctx, s);
  });

  it("approve_sets_approved", async () => {
    const c = await submitted(ctx, s.employee, s, [meal(cats, "30.00")]);
    const r = await decide(s.manager, c.approval.id, "approve");
    expect(r.status, r.text).toBe(200);
    const v = await view(s.employee, c.id);
    expect(v.body.status).toBe("approved");
    expect(v.body.decidedAt).not.toBeNull();
    expect(v.body.approval.steps[0].decidedBy).toBe(s.manager.userId);
  });

  it("return_then_resubmit", async () => {
    const c = await submitted(ctx, s.employee, s, [meal(cats, "31.00")]);
    const r = await decide(s.manager, c.approval.id, "return",
      "attach the receipt");
    expect(r.status, r.text).toBe(200);
    expect((await view(s.employee, c.id)).body.status).toBe("returned");
    const p = await as(s.employee, "PATCH", `/v1/expense-claims/${c.id}`,
      { title: "Lunch with receipt" });
    expect(p.status, p.text).toBe(200);
    const again = await claimAction(ctx, s.employee, s, c.id, "submit");
    expect(again.status, again.text).toBe(200);
    expect(again.body.approval.id).not.toBe(c.approval.id);
    const first = await decide(s.manager, c.approval.id, "approve");
    expect(first.body.error.code).toBe("APPROVAL_NOT_PENDING");
  });

  it("reject_is_final", async () => {
    const c = await submitted(ctx, s.employee, s, [meal(cats, "32.00")]);
    await decide(s.manager, c.approval.id, "reject", "not a business cost");
    expect((await view(s.employee, c.id)).body.status).toBe("rejected");
    const p = await as(s.employee, "PATCH", `/v1/expense-claims/${c.id}`,
      { title: "again" });
    expect(p.status).toBe(409);
    expect(p.body.error.code).toBe("CLAIM_NOT_EDITABLE");
    const x = await claimAction(ctx, s.employee, s, c.id, "cancel");
    expect(x.body.error.code).toBe("CLAIM_NOT_CANCELLABLE");
  });

  it("cancel_rules", async () => {
    const c = await submitted(ctx, s.employee, s, [meal(cats, "33.00")]);
    const x = await claimAction(ctx, s.employee, s, c.id, "cancel");
    expect(x.status, x.text).toBe(200);
    expect(x.body.status).toBe("cancelled");
    expect(x.body.approval.status).toBe("cancelled");
    const d = await submitted(ctx, s.employee, s, [meal(cats, "34.00")]);
    await decide(s.manager, d.approval.id, "approve");
    const mine = await claimAction(ctx, s.employee, s, d.id, "cancel");
    expect(mine.status).toBe(403);
    const noNote = await claimAction(ctx, s.hr, s, d.id, "cancel");
    expect(noNote.status).toBe(422);
    expect(noNote.body.error.code).toBe("CANCEL_NOTE_REQUIRED");
    const ok = await claimAction(ctx, s.hr, s, d.id, "cancel",
      { note: "paid by the company card" });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.status).toBe("cancelled");
  });

  it("approver_can_view_receipt", async () => {
    const up = await as(s.employee, "POST", "/v1/receipts", {
      fileName: "r.png", contentType: "image/png", dataBase64: PNG });
    const url = `/v1/receipts/${up.body.id}/content`;
    expect((await callBytes(ctx.app, s.manager.token, s.companyId, url))
      .status).toBe(404);
    const c = await createClaim(ctx, s.employee, s,
      [meal(cats, "35.00", { receiptIds: [up.body.id] })]);
    expect(c.status, c.text).toBe(201);
    const draft = await callBytes(ctx.app, s.manager.token, s.companyId,
      url);
    expect(draft.status).toBe(404);
    await claimAction(ctx, s.employee, s, c.body.id, "submit");
    const m = await callBytes(ctx.app, s.manager.token, s.companyId, url);
    expect(m.status).toBe(200);
    const meta = await as(s.manager, "GET", `/v1/receipts/${up.body.id}`);
    expect(meta.status).toBe(200);
  });
});
