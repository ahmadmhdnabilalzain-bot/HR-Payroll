import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
type T = { id: string; lang: string; kind: string;
  current: { version: number; status: string; nativeReview: unknown } };

describe("letter templates", () => {
  let ctx: Ctx;
  let s: Seeded;
  const req = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const list = async () => (await req(s.hr, "GET", "/v1/letter-templates"))
    .body.items as T[];
  const find = async (kind: string, lang: string) =>
    (await list()).find((t) => t.kind === kind && t.lang === lang)!;
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    s = await seedCompany(ctx, "tmpl");
  });

  it("signup seeds ten published starters", async () => {
    const all = await list();
    expect(all.length).toBe(10);
    for (const t of all) {
      expect(t.current).toMatchObject({ version: 1, status: "published" });
      if (t.lang === "ar") {
        expect(t.current.nativeReview).toMatchObject({
          status: "needs-native-review", reviewerName: null });
      } else expect(t.current.nativeReview).toBeNull();
    }
  });

  it("unknown fields are refused at create", async () => {
    const r = await req(s.hr, "POST", "/v1/letter-templates", { kind: "noc",
      name: "Bad", lang: "en", body: { title: "T",
        paragraphs: ["{{employee.salaryBank}}"] } });
    expect([r.status, r.body.error.code])
      .toEqual([422, "UNKNOWN_MERGE_FIELD"]);
  });

  it("a new version is a draft until published", async () => {
    const t = await find("noc", "en");
    const v = await req(s.hr, "POST", `/v1/letter-templates/${t.id}/versions`,
      { body: { title: "NOC", paragraphs: ["To: {{input.addressee}}"] } });
    expect(v.status, v.text).toBe(201);
    const draft = v.body.versions.find((x: { version: number }) =>
      x.version === 2);
    expect(draft.status).toBe("draft");
    expect(v.body.current.version).toBe(1);
    const path = `/v1/letter-templates/${t.id}/versions/${draft.id}/publish`;
    const p = await req(s.hr, "POST", path);
    expect(p.status, p.text).toBe(200);
    expect(p.body.current).toMatchObject({ version: 2,
      status: "published" });
    expect(p.body.versions.find((x: { version: number }) =>
      x.version === 1).status).toBe("superseded");
    const again = await req(s.hr, "POST", path);
    expect([again.status, again.body.error.code])
      .toEqual([409, "VERSION_NOT_DRAFT"]);
  });

  it("native review: owner only, Arabic only, per version", async () => {
    const ar = await find("noc", "ar");
    const en = await find("noc", "en");
    const g = await req(s.owner, "GET", `/v1/letter-templates/${ar.id}`);
    const v1 = g.body.current.id as string;
    const review = (u: SeedUser, t: string, v: string) => req(u, "POST",
      `/v1/letter-templates/${t}/versions/${v}/native-review`,
      { reviewerName: "Reviewer Name" });
    expect((await review(s.hr, ar.id, v1)).status).toBe(403);
    const enCur = (await req(s.owner, "GET",
      `/v1/letter-templates/${en.id}`)).body.current.id;
    const bad = await review(s.owner, en.id, enCur);
    expect([bad.status, bad.body.error.code])
      .toEqual([422, "NOT_ARABIC_TEMPLATE"]);
    const ok = await review(s.owner, ar.id, v1);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.current.nativeReview).toMatchObject({
      status: "reviewed", reviewerName: "Reviewer Name" });
    const v2 = await req(s.hr, "POST",
      `/v1/letter-templates/${ar.id}/versions`, { body: g.body.current.body });
    const d = v2.body.versions.find((x: { version: number }) =>
      x.version === 2);
    const p = await req(s.hr, "POST",
      `/v1/letter-templates/${ar.id}/versions/${d.id}/publish`);
    expect(p.body.current.nativeReview.status).toBe("needs-native-review");
  });

  it("managers read templates and fields, never create", async () => {
    expect((await req(s.manager, "GET", "/v1/letter-templates")).status)
      .toBe(200);
    const f = await req(s.manager, "GET", "/v1/letter-fields");
    expect(f.status).toBe(200);
    expect(f.body.items.length).toBeGreaterThan(20);
    expect((await req(s.manager, "POST", "/v1/letter-templates", {
      kind: "noc", name: "X", lang: "en",
      body: { title: "T", paragraphs: ["x"] } })).status).toBe(403);
    expect((await req(s.employee, "GET", "/v1/letter-templates")).status)
      .toBe(403);
  });

  it("audit rows exist and hold no template text", async () => {
    const rows = await ctx.deps.db.query<{ action: string; data: unknown }>(
      "SELECT action, data FROM audit_events WHERE company_id = $1 " +
      "AND action LIKE 'letter.template.%'", [s.companyId]);
    const actions = new Set(rows.map((r) => r.action));
    for (const a of ["letter.template.version.added",
      "letter.template.published", "letter.template.reviewed"]) {
      expect(actions.has(a), a).toBe(true);
    }
    const text = JSON.stringify(rows);
    expect(text).not.toContain("To: ");
    expect(text).not.toContain("Reviewer Name");
  });
});
