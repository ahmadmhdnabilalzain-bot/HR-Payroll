import {
  calculateProbation,
  EMPLOYMENT_PACKS,
} from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { salaryOf, seedCompany, type Seeded, type SeedUser } from
  "./helpers/seed";
import {
  addMember,
  OFFER_SENTINEL,
  seedHr,
  type HrSeeded,
} from "./helpers/seed-hr";
import { call, enrolOnly, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let h: HrSeeded;
let req: string;
let n = 0;

const P = EMPLOYMENT_PACKS[0]!.params;
const MIN_NOTICE = P.empNoticeMinDays!.value as number;
const MAX_PROBATION = P.empProbationMaxMonths!.value as number;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

const admin = <T>(sql: string) => withTenant(ctx.deps.db,
  { companyId: s.companyId, userId: null }, (tx) => tx.query<T>(sql));

async function freshApplication(stage = "offer"): Promise<string> {
  const c = await by(s.hr, "POST", "/v1/candidates",
    { fullName: `Offer Cand ${n++}`, source: "direct" });
  const a = await by(s.hr, "POST", "/v1/applications",
    { requisitionId: req, candidateId: c.body.id });
  if (stage !== "applied") {
    await by(s.hr, "POST", `/v1/applications/${a.body.id}/stage`,
      { stage });
  }
  return a.body.id;
}

function offerBody(applicationId: string, extra = {}) {
  return { applicationId, jobTitle: "Accountant", startDate: "2026-04-01",
    salary: salaryOf("5000.00").components, probationMonths: 3,
    contractNoticeDays: MIN_NOTICE, ...extra };
}

const create = async (u: SeedUser, extra = {}) =>
  by(u, "POST", "/v1/offers", offerBody(await freshApplication(), extra));

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "offers");
  h = await seedHr(ctx, s);
  const r = await by(s.hr, "POST", "/v1/requisitions", { title: "Many",
    headcount: 20, hiringManagerUserId: s.manager.userId });
  await by(s.owner, "POST", `/v1/requisitions/${r.body.id}/decision`,
    { approve: true });
  req = r.body.id;
});

describe("offers", () => {
  it("offer_requires_offer_stage", async () => {
    const id = await freshApplication("screening");
    const r = await by(s.hr, "POST", "/v1/offers", offerBody(id));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("APPLICATION_NOT_AT_OFFER");
  });

  it("offer_probation_over_max_refused", async () => {
    const r = await create(s.hr, { probationMonths: MAX_PROBATION + 1 });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("ENGINE_REFUSED");
    expect(r.body.error.detail.engineCode).toBe("PROBATION_TOO_LONG");
  });

  it("offer_notice_out_of_range_refused", async () => {
    const r = await create(s.hr, { contractNoticeDays: MIN_NOTICE - 1 });
    expect(r.status).toBe(422);
    expect(r.body.error.detail.engineCode).toBe("NOTICE_OUT_OF_RANGE");
  });

  it("offer_terms_from_engine", async () => {
    const r = await create(s.hr);
    expect(r.status, r.text).toBe(201);
    const want = calculateProbation({ joiningDate: "2026-04-01",
      probationMonths: 3 }, EMPLOYMENT_PACKS).value.probationEndDate;
    expect(r.body.probationEndDate).toBe(want);
    expect(r.body.termsTrace.length).toBeGreaterThan(0);
    expect(r.body.status).toBe("pending-approval");
  });

  it("offer_notice_checked_on_start_date", async () => {
    const r = await create(s.hr, { startDate: "2026-05-10" });
    const line = r.body.termsTrace.find((l: { id: string }) =>
      l.id === "employment.notice.contract");
    expect(line.inputs.onDate).toBe("2026-05-10");
  });

  it("offer_response_date_within_offer_life", async () => {
    const r = await create(s.hr);
    await by(s.owner, "POST", `/v1/offers/${r.body.id}/decision`,
      { approve: true });
    for (const respondedOn of ["2026-02-27", "2026-03-02"]) {
      const x = await by(s.hr, "POST", `/v1/offers/${r.body.id}/response`,
        { accepted: true, respondedOn });
      expect(x.status, respondedOn).toBe(400);
    }
  });

  it("offer_salary_hidden_from_manager", async () => {
    const r = await by(s.manager, "GET", `/v1/offers/${h.offerId}`);
    expect(r.status, r.text).toBe(200);
    expect(r.body.salary).toBeNull();
    expect(r.text).not.toContain(OFFER_SENTINEL);
    const l = await by(s.manager, "GET", "/v1/offers");
    expect(l.text).not.toContain(OFFER_SENTINEL);
    const o = await by(s.hr, "GET", `/v1/offers/${h.offerId}`);
    expect(o.text).toContain(OFFER_SENTINEL);
  });

  it("offer_approve_needs_mfa", async () => {
    const o2 = await addMember(ctx, s, "owner2.offers@example.com",
      "owner");
    await enrolOnly(ctx.app, ctx.clock, o2.token);
    const r = await create(s.hr);
    const d = await by(o2, "POST", `/v1/offers/${r.body.id}/decision`,
      { approve: true });
    expect(d.status).toBe(403);
    expect(d.body.error.code).toBe("MFA_REQUIRED");
  });

  it("offer_creator_cannot_approve", async () => {
    const r = await create(s.owner);
    expect(r.status, r.text).toBe(201);
    const d = await by(s.owner, "POST", `/v1/offers/${r.body.id}/decision`,
      { approve: true });
    expect(d.status).toBe(403);
    expect(d.body.error.code).toBe("SOD_VIOLATION");
  });

  it("offer_response_only_after_approval", async () => {
    const r = await create(s.hr);
    const x = await by(s.hr, "POST", `/v1/offers/${r.body.id}/response`,
      { accepted: true, respondedOn: "2026-03-02" });
    expect(x.status).toBe(409);
    expect(x.body.error.code).toBe("OFFER_NOT_APPROVED");
  });

  it("offer_expired_409", async () => {
    const r = await create(s.hr, { expiresOn: "2026-03-01" });
    await by(s.owner, "POST", `/v1/offers/${r.body.id}/decision`,
      { approve: true });
    const x = await by(s.hr, "POST", `/v1/offers/${r.body.id}/response`,
      { accepted: true, respondedOn: "2026-03-02" });
    expect(x.status).toBe(409);
    expect(x.body.error.code).toBe("OFFER_EXPIRED");
    const ok = await by(s.hr, "POST", `/v1/offers/${r.body.id}/response`,
      { accepted: false, respondedOn: "2026-03-01" });
    expect(ok.body.status).toBe("declined");
  });

  it("offer_one_live_per_application", async () => {
    const app = await freshApplication();
    const a = await by(s.hr, "POST", "/v1/offers", offerBody(app));
    expect(a.status).toBe(201);
    const b = await by(s.hr, "POST", "/v1/offers", offerBody(app));
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe("OFFER_EXISTS");
    const w = await by(s.hr, "POST", `/v1/offers/${a.body.id}/withdraw`);
    expect(w.body.status).toBe("withdrawn");
    const again = await by(s.hr, "POST", `/v1/offers/${a.body.id}/withdraw`);
    expect(again.body.error.code).toBe("OFFER_NOT_WITHDRAWABLE");
    const c = await by(s.hr, "POST", "/v1/offers", offerBody(app));
    expect(c.status).toBe(201);
  });

  it("offer_salary_encrypted_at_rest", async () => {
    const rows = await admin("SELECT * FROM offers");
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(OFFER_SENTINEL);
    const audit = await admin("SELECT data FROM audit_events");
    expect(JSON.stringify(audit)).not.toContain(OFFER_SENTINEL);
  });

  it("offer_basic_required", async () => {
    const salary = [{ code: "housing", label: "Housing", labelAr: null,
      amount: "100.00", sifBucket: "housing" }];
    const r = await create(s.hr, { salary });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("BASIC_COMPONENT_REQUIRED");
  });

  it("application_shows_offer_id", async () => {
    const g = await by(s.hr, "GET", `/v1/applications/${h.applicationId}`);
    expect(g.body.offerId).toBe(h.offerId);
  });
});
