import { afterAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { ADMIN_URL, closeAll, freshPgPair } from "./helpers/pg-env";
import { seedCompany } from "./helpers/seed";
import { call, fakePdf, makeApp, upload } from "./helpers/test-app";

/** Review minor 1: write-once guards, checked as the runtime role. */
describe.skipIf(!ADMIN_URL)("Plan 7 database guards", () => {
  afterAll(closeAll);

  it("refuses rewriting a verification, a review or a publish time, " +
    "a draft straight to superseded, and a foreign file row", async () => {
    const { db } = await freshPgPair(4);
    const ctx = await makeApp({ db, start: "2026-11-26T08:00:00.000Z" });
    const s = await seedCompany(ctx, "guards");
    const f = await upload(ctx.app, s.hr.token, s.companyId, "g.pdf",
      fakePdf("g"));
    const d = await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/employees/${s.emp.report}/documents`,
      { type: "contract", fileId: f.id });
    const t = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/letter-templates", { kind: "noc", name: "G", lang: "ar",
        body: { title: "ت", paragraphs: ["{{input.addressee}}"] } });
    const tv = t.body.versions[0].id as string;
    const as = (sql: string, args: unknown[]) => withTenant(db,
      { companyId: s.companyId, userId: s.hr.userId },
      (tx) => tx.query(sql, args));
    const refused = /verified once|immutable|row-level security/;
    await expect(as("UPDATE employee_document_versions SET verified_by = " +
      "NULL, verified_at = NULL WHERE id = $1", [d.body.current.id]))
      .rejects.toThrow(refused);
    await expect(as("UPDATE letter_template_versions SET status = " +
      "'superseded' WHERE id = $1", [tv])).rejects.toThrow(refused);
    await call(ctx.app, s.owner.token, s.companyId, "POST",
      `/v1/letter-templates/${t.body.id}/versions/${tv}/native-review`,
      { reviewerName: "First Reviewer" });
    await expect(as("UPDATE letter_template_versions SET reviewer_name = " +
      "'Someone Else' WHERE id = $1", [tv])).rejects.toThrow(refused);
    await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/letter-templates/${t.body.id}/versions/${tv}/publish`);
    await expect(as("UPDATE letter_template_versions SET published_at = " +
      "now() WHERE id = $1", [tv])).rejects.toThrow(refused);
    const fid = "00000000-0000-4000-8000-00000000abcd";
    await expect(as(`INSERT INTO files (id, company_id, name, mime, size,
      sha256, blob_key, uploaded_by, uploaded_at, attached_to) VALUES
      ($1, $2, 'x.pdf', 'application/pdf', 1, $3, $4, $5, now(), $6)`,
    [fid, s.companyId, "0".repeat(64), `${s.companyId}/files/${fid}`,
      s.owner.userId, `test:${f.id}`])).rejects.toThrow(refused);
  });
});
