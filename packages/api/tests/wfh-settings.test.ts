import { NEVER_COLLECTED } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { renderNotice } from "../src/wfh/notice-template";
import { seedCompany, type Seeded } from "./helpers/seed";
import { asUser, seedTime } from "./helpers/seed-time";
import { plainSession } from "./helpers/seed-wfh";
import { makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const S = "/v1/wfh/settings";

const FULL = `Work-from-home tracking notice (version 3)

Co A asks to record the following while you are clocked in
for remote work, and only then:
1. Active time: whether you used your computer in each minute (yes or
   no). Not what you typed.
2. App and website categories: one category per minute, such as
   "documents" or "meetings". Not page contents, window titles, web
   addresses or messages.
3. Location: one reading about once an hour, stored rounded to about
   110 metres.

Never recorded: screenshots, screen video, keystrokes, page contents,
window titles, web addresses, camera or microphone. The product has no
setting that turns these on.

You can see everything recorded about you, pause at any time and
download a copy. Paused time is shown as paused.

Who sees it: you see all of it. Your manager sees daily totals only.
HR and the owner see daily totals and the hourly locations.

It is never used to calculate pay. A person reviews it before it
affects attendance or overtime.

It is deleted after 30 days. Co A set this
period; the UAE data protection law (Federal Decree-Law 45 of 2021)
sets no fixed period.

You may decline, or withdraw your consent at any time. Withdrawing
stops recording at once and lets you erase what was recorded.

Legal review: this wording has not been reviewed by a lawyer.`;

const base = { companyName: "Co A", version: 3, retentionDays: 30,
  categories: true, locationHourly: true, legalReview: "not-reviewed",
  companyNote: null };

describe("wfh settings and notice", () => {
  let ctx: Ctx;
  let s: Seeded;
  let as: ReturnType<typeof asUser>;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "wset");
    await seedTime(ctx, s);
    as = asUser(ctx, s);
  });

  it("wfh_settings_need_owner_mfa", async () => {
    const hr = await as(s.hr, "PUT", S, { retentionDays: 30 });
    expect(hr.status).toBe(403);
    expect(hr.body.error.code).toBe("FORBIDDEN");
    const plain = await plainSession(ctx, s.owner.userId);
    const r = await as({ ...s.owner, token: plain }, "PUT", S,
      { retentionDays: 30 });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("MFA_REQUIRED");
  });

  it("wfh_enable_requires_retention", async () => {
    const a = await as(s.owner, "PUT", S, { enabled: true });
    expect(a.body.error.code).toBe("RETENTION_REQUIRED");
    const b = await as(s.owner, "PUT", S, { enabled: true,
      retentionDays: 30 });
    expect(b.body.error.code).toBe("IMPACT_ASSESSMENT_REQUIRED");
    const c = await as(s.owner, "PUT", S, { enabled: true,
      retentionDays: 30, impactAssessment: { done: true,
        date: "2026-02-01" } });
    expect(c.status).toBe(422);
    expect(c.body.error.code).toBe("NOTICE_REQUIRED");
    await as(s.owner, "PUT", S, { retentionDays: 30, impactAssessment: {
      done: true, date: "2026-02-01" } });
    const n = await as(s.hr, "POST", "/v1/wfh/notices", {});
    expect(n.status, n.text).toBe(201);
    const ok = await as(s.owner, "PUT", S, { enabled: true });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body).toMatchObject({ enabled: true, noticeVersion: 1 });
  });

  it("wfh_no_switch_for_forbidden_capture", async () => {
    for (const k of ["screenshots", "keystrokes", "pageContents"]) {
      const r = await as(s.owner, "PUT", S, { [k]: true });
      expect(r.status, k).toBe(400);
    }
    const g = await as(s.employee, "GET", S);
    expect(g.body.neverCollected).toEqual([...NEVER_COLLECTED]);
    // Every table, not only wfh_ ones (review M2b, M2c). Allowed by
    // table and column: an employee's job title, an expense claim's
    // title and deadline, a receipt's MIME type. None is a window
    // title, page content or capture.
    const innocent = new Set(["employees.job_title",
      "expense_policies.claim_window_days", "receipts.content_type",
      "expense_claims.title"]);
    const cols = await ctx.deps.db.query<{ table_name: string;
      column_name: string }>(`SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()`);
    expect(cols.some((c) => c.table_name.startsWith("wfh_"))).toBe(true);
    const banned = new RegExp("screen|keystroke|key_log|url|title|content|" +
      "host|domain|window|image|capture|clip|typed|keys");
    for (const c of cols) {
      if (innocent.has(`${c.table_name}.${c.column_name}`)) continue;
      expect(c.column_name, c.table_name).not.toMatch(banned);
    }
  });

  it("notice_text_exact", () => {
    expect(renderNotice(base)).toBe(FULL);
    const off = renderNotice({ ...base, locationHourly: false });
    expect(off).not.toContain("Location:");
    expect(off).toContain("2. App and website categories");
    expect(off).not.toContain("\n3. ");
    expect(off.split("\n")).toContain("HR and the owner see daily totals.");
    const noCat = renderNotice({ ...base, categories: false });
    expect(noCat).toContain("2. Location: one reading");
    const counsel = renderNotice({ ...base,
      legalReview: "reviewed-by-company-counsel" });
    expect(counsel.endsWith("Legal review: this\nwording was reviewed by " +
      "the company's counsel.")).toBe(true);
    const note = renderNotice({ ...base, companyNote: "Hello." });
    expect(note.endsWith("\n\nNote from Co A:\nHello.")).toBe(true);
  });

  it("notice_arabic_hidden", async () => {
    const r = await as(s.employee, "GET", "/v1/wfh/notices/current");
    expect(r.status, r.text).toBe(200);
    expect(r.body.textAr).toBeNull();
    expect(r.body.arabicStatus).toBe("not-reviewed");
  });

  it("settings_change_bumps_notice", async () => {
    const r = await as(s.owner, "PUT", S, { retentionDays: 45 });
    expect(r.body.noticeVersion).toBe(2);
    const n = await as(s.employee, "GET", "/v1/wfh/notices/current");
    expect(n.body.version).toBe(2);
    expect(n.body.retentionDays).toBe(45);
    expect(n.body.textEn).toContain("deleted after 45 days");
  });
});
