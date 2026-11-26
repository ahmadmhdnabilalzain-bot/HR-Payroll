import { describe, expect, it } from "vitest";
import { CERT, letterWorld } from "./helpers/letter-world";

/** Review I-2: the native-review gate follows the text, not `lang`. */
describe("Arabic text in an English template", () => {
  it("needs a native review before issue", async () => {
    const w = await letterWorld("r2");
    const { s } = w;
    const t = await w.req(s.hr, "POST", "/v1/letter-templates", {
      kind: "noc", name: "Mixed", lang: "en", body: { title: "رسالة",
        paragraphs: ["إلى: {{input.addressee}} {{input.purpose}}"] } });
    expect(t.status, t.text).toBe(201);
    const v = t.body.versions[0];
    expect(v.nativeReview).toMatchObject({ status: "needs-native-review" });
    await w.req(s.hr, "POST",
      `/v1/letter-templates/${t.body.id}/versions/${v.id}/publish`);
    const body = { templateId: t.body.id, employeeId: s.emp.report,
      ...CERT };
    const blocked = await w.req(s.hr, "POST", "/v1/letters", body);
    expect([blocked.status, blocked.body.error.code])
      .toEqual([422, "ARABIC_NOT_REVIEWED"]);
    const rv = await w.req(s.owner, "POST", `/v1/letter-templates/` +
      `${t.body.id}/versions/${v.id}/native-review`,
    { reviewerName: "Native Reviewer" });
    expect(rv.status, rv.text).toBe(200);
    expect((await w.req(s.hr, "POST", "/v1/letters", body)).status)
      .toBe(201);
  });
  it("a purely English template still needs no review", async () => {
    const w = await letterWorld("r2b");
    const t = await w.req(w.s.hr, "POST", "/v1/letter-templates", {
      kind: "noc", name: "Plain", lang: "en", body: { title: "Note",
        paragraphs: ["To: {{input.addressee}}"] } });
    expect(t.body.versions[0].nativeReview).toBeNull();
  });
});
