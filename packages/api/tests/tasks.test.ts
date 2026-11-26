import { ROUTES } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { hrAudit } from "../src/audit/hr-audit";
import { withTenant } from "../src/db/tenant";
import { cancelFlowTasks, createTasks } from "../src/tasks/tasks";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;

const as = (who: keyof Pick<Seeded, "owner" | "hr" | "manager" |
  "employee">, method: string, path: string, body?: unknown) =>
  call(ctx.app, s[who].token, s.companyId, method, path, body);

const audits = (action: string) => withTenant(ctx.deps.db,
  { companyId: s.companyId, userId: null }, (tx) =>
    tx.query<{ data: Record<string, unknown>; entity_id: string }>(
      "SELECT data, entity_id FROM audit_events WHERE action = $1 " +
      "ORDER BY seq", [action]));

const tenantTx = <T>(fn: Parameters<typeof withTenant<T>>[2]) =>
  withTenant(ctx.deps.db, { companyId: s.companyId,
    userId: s.hr.userId }, fn);

beforeAll(async () => {
  ctx = await makeApp({ start: "2026-03-01T14:00:00.000Z" });
  s = await seedCompany(ctx, "tasks");
});

describe("task manager", () => {
  it("tasks_employee_creates_self_task", async () => {
    const r = await as("employee", "POST", "/v1/tasks",
      { title: "Upload passport copy" });
    expect(r.status, r.text).toBe(201);
    expect(r.body.assigneeUserId).toBe(s.employee.userId);
    expect(r.body.source).toBe("manual");
    const a = await audits("task.created");
    const mine = a.find((x) => x.entity_id === r.body.id);
    expect(mine?.data.source).toBe("manual");
  });

  it("tasks_employee_cannot_assign_others", async () => {
    const r = await as("employee", "POST", "/v1/tasks",
      { title: "x", assigneeUserId: s.hr.userId });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
  });

  it("tasks_visibility_assigned_or_created", async () => {
    const t = await as("hr", "POST", "/v1/tasks",
      { title: "Private hr task" });
    expect(t.status).toBe(201);
    const g = await as("manager", "GET", `/v1/tasks/${t.body.id}`);
    expect(g.status).toBe(404);
    const l = await as("manager", "GET", "/v1/tasks");
    expect(l.body.items.map((x: { id: string }) => x.id))
      .not.toContain(t.body.id);
    const o = await as("owner", "GET", `/v1/tasks/${t.body.id}`);
    expect(o.status).toBe(200);
  });

  it("tasks_status_transitions", async () => {
    const t = await as("hr", "POST", "/v1/tasks", { title: "Flow" });
    const p = `/v1/tasks/${t.body.id}`;
    const done = await as("hr", "PATCH", p, { status: "done" });
    expect(done.body.completedAt).toBe(ctx.clock.now.toISOString());
    const back = await as("hr", "PATCH", p, { status: "open" });
    expect(back.body.completedAt).toBeNull();
    await as("hr", "PATCH", p, { status: "done" });
    const bad = await as("hr", "PATCH", p, { status: "in-progress" });
    expect(bad.status).toBe(409);
    expect(bad.body.error.code).toBe("TASK_TRANSITION");
  });

  it("tasks_overdue_uses_dubai_date", async () => {
    const t = await as("hr", "POST", "/v1/tasks",
      { title: "Due", dueDate: "2026-03-01" });
    const saved = ctx.clock.now;
    try {
      ctx.clock.now = new Date("2026-02-28T20:30:00.000Z");
      const a = await as("hr", "GET", `/v1/tasks/${t.body.id}`);
      expect(a.body.overdue).toBe(false);
      ctx.clock.now = new Date("2026-03-01T20:00:00.000Z");
      const b = await as("hr", "GET", `/v1/tasks/${t.body.id}`);
      expect(b.body.overdue).toBe(true);
    } finally {
      ctx.clock.now = saved;
    }
  });

  it("tasks_checklist_toggle_and_remove", async () => {
    const t = await as("hr", "POST", "/v1/tasks",
      { title: "Docs", checklist: ["Passport", "Visa"] });
    expect(t.body.checklistTotal).toBe(2);
    const [a, b] = t.body.checklist;
    const p = `/v1/tasks/${t.body.id}/checklist`;
    const on = await as("hr", "PATCH", `${p}/${a.id}`, { done: true });
    expect(on.status, on.text).toBe(200);
    const item = on.body.checklist.find((x: { id: string }) =>
      x.id === a.id);
    expect(item.doneBy).toBe(s.hr.userId);
    expect(on.body.checklistDone).toBe(1);
    const rm = await as("hr", "PATCH", `${p}/${b.id}`, { removed: true });
    const gone = rm.body.checklist.find((x: { id: string }) =>
      x.id === b.id);
    expect(gone.status).toBe("removed");
    expect(rm.body.checklistTotal).toBe(1);
  });

  it("tasks_comment_audit_has_no_body", async () => {
    const t = await as("hr", "POST", "/v1/tasks", { title: "Talk" });
    const body = "Called the bank about the IBAN letter";
    const c = await as("hr", "POST", `/v1/tasks/${t.body.id}/comments`,
      { body });
    expect(c.status).toBe(201);
    expect(c.body.comments[0].body).toBe(body);
    expect(c.body.commentCount).toBe(1);
    const a = await audits("task.commented");
    expect(a.length).toBeGreaterThan(0);
    expect(JSON.stringify(a)).not.toContain(body);
    const bad = tenantTx((tx) => hrAudit(tx, { companyId: s.companyId,
      at: ctx.clock.now.toISOString(), actorUserId: null,
      action: "task.updated", entityType: "task", entityId: null,
      data: { note: "x" } }));
    await expect(bad).rejects.toMatchObject({
      code: "AUDIT_SENSITIVE_DATA" });
  });

  it("tasks_assignee_must_be_member", async () => {
    const r = await as("hr", "POST", "/v1/tasks", { title: "x",
      assigneeUserId: "00000000-0000-4000-8000-00000000dead" });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("ASSIGNEE_NOT_MEMBER");
  });

  it("tasks_link_employee_out_of_scope_404", async () => {
    const r = await as("manager", "POST", "/v1/tasks",
      { title: "x", employeeId: s.emp.outsider });
    expect(r.status).toBe(404);
    const ok = await as("manager", "POST", "/v1/tasks",
      { title: "x", employeeId: s.emp.report });
    expect(ok.status).toBe(201);
  });

  it("tasks_flow_cancel_hr_only", async () => {
    const flow = { type: "exit" as const,
      id: "00000000-0000-4000-8000-00000000f10e" };
    const [t] = await tenantTx((tx) => createTasks(tx, ctx.deps,
      s.companyId, s.hr.userId, [{ title: "Return laptop",
        description: null, assigneeUserId: s.employee.userId,
        assigneeRole: null, dueDate: "2026-03-20", employeeId: s.emp.report,
        flow, source: "exit-template", rule: null, checklist: [] }]));
    const p = `/v1/tasks/${t!.id}`;
    const e = await as("employee", "PATCH", p, { status: "cancelled" });
    expect(e.status).toBe(403);
    const ids = await tenantTx((tx) => cancelFlowTasks(tx, ctx.deps,
      s.companyId, s.hr.userId, flow, "exit withdrawn"));
    expect(ids).toEqual([t!.id]);
    const g = await as("hr", "GET", p);
    expect(g.body.status).toBe("cancelled");
    expect(g.body.comments.map((c: { body: string }) => c.body))
      .toContain("exit withdrawn");
    const reopen = await as("employee", "PATCH", p, { status: "open" });
    expect(reopen.status).toBe(403);
    const hr = await as("hr", "PATCH", p, { status: "open" });
    expect(hr.status).toBe(200);
  });

  it("tasks_employee_cannot_edit_title_of_hr_task", async () => {
    const t = await as("hr", "POST", "/v1/tasks", { title: "Sign form",
      assigneeUserId: s.employee.userId });
    const p = `/v1/tasks/${t.body.id}`;
    const r = await as("employee", "PATCH", p, { title: "changed" });
    expect(r.status).toBe(403);
    const ok = await as("employee", "PATCH", p, { status: "done" });
    expect(ok.status).toBe(200);
  });

  it("tasks_no_delete_route", () => {
    expect(ROUTES.filter((r) => (r.method as string) === "DELETE"))
      .toEqual([]);
  });
});
