import { createHash } from "node:crypto";
import { PREVIEW_WATERMARK } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { unavailableRenderer } from "../src/pdf/renderer";
import { CERT, letterWorld } from "./helpers/letter-world";
import type { Seeded } from "./helpers/seed";
import type { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const asText = (b: Uint8Array) => Buffer.from(b).toString("utf8");

describe("letters", () => {
  let w: Awaited<ReturnType<typeof letterWorld>>;
  let ctx: Ctx;
  let s: Seeded;
  beforeAll(async () => {
    w = await letterWorld("letters");
    ctx = w.ctx;
    s = w.s;
  });

  it("hr issues a salary certificate; the stored PDF matches", async () => {
    const r = await w.issue(s.hr, "salary-certificate", { ...CERT,
      employeeId: s.emp.report });
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ templateVersion: 1, kind:
      "salary-certificate", lang: "en", employeeId: s.emp.report,
      fileName: "salary-certificate-2026-11-26-en.pdf" });
    const d = await w.download(s.hr, r.body.id);
    expect(d.status).toBe(200);
    expect(sha(d.bytes)).toBe(r.body.sha256);
    expect(d.headers.get("content-type")).toBe("application/pdf");
    expect(d.headers.get("content-disposition")).toMatch(/^attachment;/);
    const text = asText(d.bytes);
    expect(text).toContain("Person 2");
    expect(text).toContain("AED 2,222.22");
    const [a] = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events WHERE action = 'letter.issued' " +
      "AND entity_id = $1", [r.body.id]);
    const audit = JSON.stringify(a!.data);
    expect(audit).not.toContain("2222.22");
    expect(audit).not.toContain("2,222.22");
    expect(audit).not.toContain("Person 2");
  });

  it("a letter keeps the version it was issued from", async () => {
    const t = w.tmpl("noc");
    const first = await w.issue(s.hr, "noc", { ...CERT,
      employeeId: s.emp.report });
    const g = await w.req(s.hr, "GET", `/v1/letter-templates/${t.id}`);
    const v = await w.req(s.hr, "POST",
      `/v1/letter-templates/${t.id}/versions`, { body: g.body.current.body });
    await w.req(s.hr, "POST", `/v1/letter-templates/${t.id}/versions/` +
      `${v.body.versions[1].id}/publish`);
    const second = await w.issue(s.hr, "noc", { ...CERT,
      employeeId: s.emp.report });
    expect((await w.req(s.hr, "GET", `/v1/letters/${first.body.id}`)).body
      .templateVersion).toBe(1);
    expect(second.body.templateVersion).toBe(2);
  });

  it("a missing input is named", async () => {
    const r = await w.issue(s.hr, "noc", { employeeId: s.emp.report,
      inputs: { "input.addressee": "Example Bank" } });
    expect([r.status, r.body.error.code, r.body.error.detail.fields])
      .toEqual([422, "MERGE_VALUE_MISSING", ["input.purpose"]]);
  });

  it("Arabic letters wait for a native review; preview works", async () => {
    const body = { ...CERT, employeeId: s.emp.report };
    const blocked = await w.issue(s.hr, "salary-certificate", body, "ar");
    expect([blocked.status, blocked.body.error.code])
      .toEqual([422, "ARABIC_NOT_REVIEWED"]);
    const count = async () => (await ctx.deps.db.query(
      "SELECT 1 FROM letters")).length;
    const n = await count();
    const p = await w.req(s.hr, "POST", "/v1/letters/preview", {
      templateId: w.tmpl("salary-certificate", "ar").id, ...body });
    expect(p.status, p.text).toBe(200);
    expect(p.body.watermark).toBe(PREVIEW_WATERMARK);
    expect(Buffer.from(p.body.contentBase64, "base64").toString("utf8"))
      .toContain(PREVIEW_WATERMARK);
    expect(await count()).toBe(n);
    const ar = w.tmpl("salary-certificate", "ar");
    const rv = await w.req(s.owner, "POST", `/v1/letter-templates/${ar.id}` +
      `/versions/${ar.current.id}/native-review`,
    { reviewerName: "Native Reviewer" });
    expect(rv.status, rv.text).toBe(200);
    const ok = await w.issue(s.hr, "salary-certificate", body, "ar");
    expect(ok.status, ok.text).toBe(201);
  });

  it("employee-based kinds need an employee; offers do not", async () => {
    const r = await w.issue(s.hr, "salary-certificate", CERT);
    expect([r.status, r.body.error.code])
      .toEqual([422, "EMPLOYEE_REQUIRED"]);
    const o = await w.issue(s.hr, "offer", { inputs: {
      "input.candidateName": "Sample Candidate", "input.position": "Clerk",
      "input.startDate": "2027-01-01", "input.offerMonthlyTotal": "5000" } });
    expect(o.status, o.text).toBe(201);
    expect(asText((await w.download(s.hr, o.body.id)).bytes))
      .toContain("AED 5,000.00");
  });

  it("stored merge values are encrypted", async () => {
    const rows = await ctx.deps.db.query<{ merge_enc: string }>(
      "SELECT merge_enc FROM letters");
    const text = JSON.stringify(rows);
    expect(rows.length).toBeGreaterThan(0);
    expect(text).not.toContain("2,222.22");
    expect(text).not.toContain("Person 2");
  });

  it("the named employee acknowledges once; others get 404", async () => {
    const r = await w.issue(s.hr, "noc", { ...CERT,
      employeeId: s.emp.report });
    const path = `/v1/letters/${r.body.id}/acknowledge`;
    const a = await w.req(s.employee, "POST", path);
    expect(a.status, a.text).toBe(200);
    expect(a.body.acknowledgedAt).not.toBeNull();
    ctx.clock.advance(60_000);
    const b = await w.req(s.employee, "POST", path);
    expect(b.body.acknowledgedAt).toBe(a.body.acknowledgedAt);
    expect((await w.req(s.manager, "POST", path)).status).toBe(404);
  });

  it("letters join the retention due list", async () => {
    const cur = (await w.req(s.owner, "GET", "/v1/document-settings")).body;
    await w.req(s.owner, "PUT", "/v1/document-settings", { ...cur,
      retention: { ...cur.retention, letter: { months: 1, from: "issue" } } });
    const none = await w.req(s.hr, "GET", "/v1/document-retention");
    expect(none.body.due.some((d: { kind: string }) => d.kind === "letter"))
      .toBe(false);
    // As if the clock had moved on a month (sessions last 8 hours, so
    // the letter is dated back instead; test database only).
    const [l] = await ctx.deps.db.query<{ id: string }>(
      "SELECT id FROM letters WHERE employee_id IS NOT NULL LIMIT 1");
    await ctx.deps.db.query("UPDATE letters SET issued_at = $2 WHERE id = $1",
      [l!.id, "2026-10-20T08:00:00.000Z"]);
    const due = await w.req(s.hr, "GET", "/v1/document-retention");
    expect(due.status, due.text).toBe(200);
    expect(due.body.due).toContainEqual({ kind: "letter", id: l!.id,
      employeeId: expect.anything(), retentionClass: "letter",
      retainUntil: "2026-11-20" });
  });
});

describe("Arabic letters need the Arabic company name", () => {
  it("names company.nameAr when it is not set", async () => {
    const w = await letterWorld("noar");
    await w.req(w.s.owner, "PATCH", "/v1/company", { nameAr: null });
    const p = await w.req(w.s.hr, "POST", "/v1/letters/preview", {
      templateId: w.tmpl("noc", "ar").id, employeeId: w.s.emp.report,
      ...CERT });
    expect([p.status, p.body.error.code, p.body.error.detail.fields])
      .toEqual([422, "MERGE_VALUE_MISSING", ["company.nameAr"]]);
  });
});

describe("letters without a renderer", () => {
  it("issue answers 503 and stores nothing", async () => {
    const w = await letterWorld("nopdf", { pdf: unavailableRenderer() });
    const r = await w.issue(w.s.hr, "noc", { ...CERT,
      employeeId: w.s.emp.report });
    expect([r.status, r.body.error.code])
      .toEqual([503, "PDF_RENDERER_UNAVAILABLE"]);
    expect((await w.ctx.deps.db.query("SELECT 1 FROM letters")).length)
      .toBe(0);
    expect((await w.ctx.deps.db.query(
      "SELECT 1 FROM audit_events WHERE action = 'letter.issued'")).length)
      .toBe(0);
  });
});
