import { describe, expect, it } from "vitest";
import { CERT, letterWorld } from "./helpers/letter-world";
import { fakePdf, upload } from "./helpers/test-app";

const asText = (b: Uint8Array) => Buffer.from(b).toString("utf8");

/** Review minors 3, 4, 8 and 9. */
describe("letter and library details", () => {
  it("bidi controls never reach a letter", async () => {
    const w = await letterWorld("rm1");
    const l = await w.issue(w.s.hr, "noc", { employeeId: w.s.emp.report,
      inputs: { "input.addressee": "Bank‮KNAB",
        "input.purpose": "Loan⁦x⁩" } });
    expect(l.status, l.text).toBe(201);
    const text = asText((await w.download(w.s.hr, l.body.id)).bytes);
    expect(text).toContain("BankKNAB");
    expect(text).not.toMatch(/[‪-‮⁦-⁩]/);
  });

  it("managers do not see reviewer names; another kind is 404",
    async () => {
      const w = await letterWorld("rm2");
      const ar = w.tmpl("noc", "ar");
      await w.req(w.s.owner, "POST", `/v1/letter-templates/${ar.id}/` +
        `versions/${ar.current.id}/native-review`,
      { reviewerName: "Private Person" });
      const m = await w.req(w.s.manager, "GET",
        `/v1/letter-templates/${ar.id}`);
      expect(m.status).toBe(200);
      expect(m.body.current.nativeReview.status).toBe("reviewed");
      expect(m.text).not.toContain("Private Person");
      const h = await w.req(w.s.hr, "GET", `/v1/letter-templates/${ar.id}`);
      expect(h.text).toContain("Private Person");
      const cert = await w.issue(w.s.manager, "salary-certificate",
        { ...CERT, employeeId: w.s.emp.report });
      expect(cert.status).toBe(404);
    });

  it("a library document that asks no acknowledgement refuses one",
    async () => {
      const w = await letterWorld("rm3");
      const f = await upload(w.ctx.app, w.s.hr.token, w.s.companyId, "n.pdf",
        fakePdf("n"));
      const d = await w.req(w.s.hr, "POST", "/v1/library", { title: "Note",
        category: "notice", fileId: f.id, requiresAck: false,
        audience: { allStaff: true, departmentIds: [], employeeIds: [],
          roles: [] } });
      const a = await w.req(w.s.employee, "POST",
        `/v1/library/${d.body.id}/acknowledge`,
        { versionId: d.body.current.id });
      expect([a.status, a.body.error.code])
        .toEqual([409, "ACK_NOT_REQUIRED"]);
    });
});
