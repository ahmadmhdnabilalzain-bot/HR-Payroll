import { calculateProbation, EMPLOYMENT_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let n = 50;

const P = EMPLOYMENT_PACKS[0]!.params;
const MIN_NOTICE = P.empNoticeMinDays!.value as number;
const MAX_PROBATION = P.empProbationMaxMonths!.value as number;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

/** A joiner the employment pack covers, managed by the manager. */
async function joiner(joiningDate = "2026-02-01"): Promise<string> {
  const r = await by(s.hr, "POST", "/v1/employees", { number: `J-${n++}`,
    fullName: "New Joiner", jobTitle: "Clerk", nationality: "IN",
    workerClass: "expat-full-time", joiningDate,
    managerId: s.emp.manager });
  if (r.status !== 201) throw new Error(r.text);
  return r.body.id;
}

const put = (id: string, probationMonths: number) => by(s.hr, "PUT",
  `/v1/employees/${id}/terms`, { probationMonths,
    contractNoticeDays: MIN_NOTICE });

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "terms");
});

describe("employment terms", () => {
  it("terms_put_returns_engine_dates", async () => {
    const id = await joiner();
    const r = await put(id, MAX_PROBATION);
    expect(r.status, r.text).toBe(200);
    const want = calculateProbation({ joiningDate: "2026-02-01",
      probationMonths: MAX_PROBATION }, EMPLOYMENT_PACKS).value;
    expect(r.body.probationEndDate).toBe(want.probationEndDate);
    expect(r.body.employerNoticeDeadline)
      .toBe(want.employerNoticeDeadline);
    expect(r.body.trace.length).toBeGreaterThan(0);
    const g = await by(s.manager, "GET", `/v1/employees/${id}/terms`);
    expect(g.status).toBe(200);
    expect(g.body.probationEndDate).toBe(want.probationEndDate);
  });

  it("terms_over_max_refused", async () => {
    const r = await put(await joiner(), MAX_PROBATION + 1);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("ENGINE_REFUSED");
  });

  it("terms_change_cancels_and_recreates_reminders", async () => {
    const id = await joiner();
    await put(id, MAX_PROBATION);
    const q = `/v1/tasks?employeeId=${id}`;
    const before = (await by(s.hr, "GET", q)).body.items;
    expect(before.length).toBe(2);
    await put(id, 3);
    const after = (await by(s.hr, "GET", q)).body.items;
    const old = after.filter((t: { id: string }) =>
      before.some((b: { id: string }) => b.id === t.id));
    expect(old.map((t: { status: string }) => t.status))
      .toEqual(["cancelled", "cancelled"]);
    for (const t of old) {
      const full = await by(s.hr, "GET", `/v1/tasks/${t.id}`);
      expect(full.body.comments[0].body).toContain("terms changed");
    }
    const fresh = after.filter((t: { status: string }) =>
      t.status === "open");
    const want = calculateProbation({ joiningDate: "2026-02-01",
      probationMonths: 3 }, EMPLOYMENT_PACKS).value;
    expect(fresh.map((t: { dueDate: string }) => t.dueDate).sort())
      .toEqual([want.employerNoticeDeadline, want.probationEndDate].sort());
    expect(fresh[0].assigneeUserId).toBe(s.manager.userId);
  });

  it("terms_out_of_scope_404", async () => {
    const r = await by(s.manager, "GET",
      `/v1/employees/${s.emp.outsider}/terms`);
    expect(r.status).toBe(404);
  });

  it("terms_pre_law_joiner_zero_months_only", async () => {
    const zero = await put(s.emp.report, 0);
    expect(zero.status, zero.text).toBe(200);
    expect(zero.body.probationEndDate).toBeNull();
    const some = await put(s.emp.report2, 3);
    expect(some.status).toBe(422);
    expect(some.body.error.detail.engineCode).toBe("NO_PACK_FOR_DATE");
  });

  it("default_template_labelled", async () => {
    const r = await by(s.hr, "GET", "/v1/checklist-templates");
    expect(r.status, r.text).toBe(200);
    expect(r.body.items.map((t: { kind: string }) => t.kind).sort())
      .toEqual(["exit", "onboarding"]);
    for (const t of r.body.items) {
      expect(t.isDefault).toBe(true);
      expect(t.version).toBe(0);
      expect(t.label).toBe("product default, not law");
    }
  });

  it("template_put_versions", async () => {
    const items = [{ title: "Welcome lunch", category: "other",
      assignee: "manager", dueOffsetDays: 0 }];
    const a = await by(s.hr, "PUT", "/v1/checklist-templates/onboarding",
      { items });
    expect(a.status, a.text).toBe(200);
    expect(a.body.version).toBe(1);
    const b = await by(s.hr, "PUT", "/v1/checklist-templates/onboarding",
      { items });
    expect(b.body.version).toBe(2);
    expect(b.body.isDefault).toBe(false);
    expect(b.body.label).toBeNull();
  });
});
