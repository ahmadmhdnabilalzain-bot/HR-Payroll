import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import type { FileCtx } from "../src/files/files";
import { loadLetterValues } from "../src/letters/letters";
import { CERT, letterWorld } from "./helpers/letter-world";
import { SENTINELS } from "./helpers/seed";
import { call, callBytes, enableMfa, signup } from "./helpers/test-app";

const WARN = (reason = "Late twice") => ({ inputs: {
  "input.incidentDate": "2026-11-20", "input.reason": reason,
  "input.replyTo": "hr@example.com" } });
const asText = (b: Uint8Array) => Buffer.from(b).toString("utf8");

describe("letter access (Review Focus 4)", () => {
  let w: Awaited<ReturnType<typeof letterWorld>>;
  beforeAll(async () => {
    w = await letterWorld("lacc");
  });

  it("managers issue warnings for direct reports only", async () => {
    const { s } = w;
    const cert = await w.issue(s.manager, "salary-certificate", { ...CERT,
      employeeId: s.emp.report });
    // 404, not the plan's 403: the review asked that a template of a
    // kind the role may not issue is not revealed.
    expect([cert.status, cert.body.error.code]).toEqual([404, "NOT_FOUND"]);
    const ok = await w.issue(s.manager, "warning", { ...WARN(),
      employeeId: s.emp.report });
    expect(ok.status, ok.text).toBe(201);
    const out = await w.issue(s.manager, "warning", { ...WARN(),
      employeeId: s.emp.outsider });
    expect(out.status).toBe(404);
    const self = await w.issue(s.manager, "warning", { ...WARN(),
      employeeId: s.emp.manager });
    expect(self.status).toBe(404);
  });

  it("a template with a salary field needs owner or hr", async () => {
    const { s } = w;
    const t = await w.req(s.hr, "POST", "/v1/letter-templates", {
      kind: "warning", name: "Pay warning", lang: "en", body: {
        title: "Warning", paragraphs: ["Pay {{salary.basic}}",
          "{{input.reason}}"] } });
    const v = t.body.versions[0].id as string;
    await w.req(s.hr, "POST",
      `/v1/letter-templates/${t.body.id}/versions/${v}/publish`);
    const body = { templateId: t.body.id, employeeId: s.emp.report,
      inputs: { "input.reason": "x" } };
    const m = await w.req(s.manager, "POST", "/v1/letters", body);
    expect([m.status, m.body.error.code])
      .toEqual([403, "SALARY_LETTER_NEEDS_HR"]);
    expect((await w.req(s.hr, "POST", "/v1/letters", body)).status)
      .toBe(201);
  });

  it("manager_input_not_expanded", async () => {
    const { s, ctx } = w;
    const r = await w.issue(s.manager, "warning", {
      ...WARN("see {{salary.basic}}"), employeeId: s.emp.report });
    expect(r.status, r.text).toBe(201);
    const text = asText((await w.download(s.manager, r.body.id)).bytes);
    expect(text).toContain("see {{salary.basic}}");
    expect(text).not.toContain("2,222.22");
    expect(text).not.toContain(SENTINELS.report.salary);
    const values = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: s.manager.userId }, (tx) => loadLetterValues({ tx,
      deps: ctx.deps, user: { id: s.manager.userId },
      tenant: { companyId: s.companyId, role: "manager",
        employeeId: s.emp.manager } } as unknown as FileCtx, r.body.id));
    expect(values).not.toHaveProperty("salary.basic");
    expect(values["input.reason"]).toBe("see {{salary.basic}}");
  });

  it("reads: the named employee, the issuer, owner and hr", async () => {
    const { s } = w;
    const mine = await w.issue(s.hr, "noc", { ...CERT,
      employeeId: s.emp.report });
    const theirs = await w.issue(s.hr, "salary-certificate", { ...CERT,
      employeeId: s.emp.report2 });
    const list = await w.req(s.employee, "GET", "/v1/letters");
    expect(list.body.items.length).toBeGreaterThan(0);
    for (const l of list.body.items) expect(l.employeeId).toBe(s.emp.report);
    expect((await w.download(s.employee, theirs.body.id)).status).toBe(404);
    expect((await w.download(s.employee, mine.body.id)).status).toBe(200);
    expect((await w.download(s.manager, theirs.body.id)).status).toBe(404);
    expect((await w.req(s.employee, "POST", "/v1/letters/preview", {
      templateId: w.tmpl("noc").id, employeeId: s.emp.report,
      ...CERT })).status).toBe(403);
  });

  it("an issuer who loses hr loses the letters they issued", async () => {
    const { s } = w;
    const cert = await w.issue(s.hr, "salary-certificate", { ...CERT,
      employeeId: s.emp.outsider });
    const noc = await w.issue(s.hr, "noc", { ...CERT,
      employeeId: s.emp.outsider });
    const ch = await call(w.ctx.app, s.owner.token, s.companyId, "PATCH",
      `/v1/users/${s.hr.userId}`, { role: "manager" });
    expect(ch.status, ch.text).toBe(200);
    expect((await w.req(s.hr, "GET", `/v1/letters/${cert.body.id}`)).status)
      .toBe(404);
    // Not the outsider's manager either (review I-4).
    expect((await w.req(s.hr, "GET", `/v1/letters/${noc.body.id}`)).status)
      .toBe(404);
  });

  it("another company's owner gets 404", async () => {
    const { s, ctx } = w;
    const l = await w.issue(s.owner, "noc", { ...CERT,
      employeeId: s.emp.report });
    const b = await signup(ctx.app, "laccb");
    const m = await enableMfa(ctx.app, ctx.clock, b);
    expect((await call(ctx.app, m.token, b.companyId, "GET",
      `/v1/letters/${l.body.id}`)).status).toBe(404);
    expect((await callBytes(ctx.app, m.token, b.companyId,
      `/v1/letters/${l.body.id}/download`)).status).toBe(404);
  });
});
