import { DOCUMENT_ROUTES, type RouteDef } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { PLAN7_PENDING } from "./helpers/plan7-pending";
import {
  SENTINELS,
  seedCompany,
  type Seeded,
  type Target,
} from "./helpers/seed";
import {
  DOC_NUMBERS,
  seedDocuments,
  type SeededDoc,
} from "./helpers/seed-documents";
import { call, fakePdf, makeApp, upload } from "./helpers/test-app";

/**
 * Plan 7's GET routes for every role and every record: the status the
 * role should get, and no document number (or file marker) the role
 * may not see. Owner and hr see all; the person sees their own; a
 * manager sees reports' slots without numbers or files.
 */
type Role = "owner" | "hr" | "manager" | "employee";
const ROLES: Role[] = ["owner", "hr", "manager", "employee"];
const TARGETS: Target[] = ["manager", "report", "report2", "outsider"];
const OWN: Record<Role, Target | null> = { owner: null, hr: null,
  manager: "manager", employee: "report" };
const REPORTS: Target[] = ["report", "report2"];

type Kind = "employee" | "document" | "download" | "library" |
  "template" | "letter" | null;
const ID_KIND: Record<string, Kind> = {
  employeeDocumentsList: "employee", employeeDocumentGet: "document",
  employeeDocumentDownload: "download", documentAlerts: null,
  documentSettingsGet: null, documentRetentionDue: null,
  libraryList: null, libraryGet: "library", libraryDownload: "library",
  libraryReceipts: "library", letterFields: null,
  letterTemplatesList: null, letterTemplateGet: "template",
  lettersList: null, letterGet: "letter", letterDownload: "letter",
  emiratisationReport: null,
};

/** A salary as a letter prints it ("1,111.11"). */
const printed = (t: Target) =>
  SENTINELS[t].salary.replace(/\B(?=(\d{3})+\.)/g, ",");

/** In a library file shared with the employee's record only. */
const LIB_MARKER = "LIBSECRET-7";

function forbidden(role: Role): string[] {
  if (role === "owner" || role === "hr") return [];
  const lib = role === "manager" ? [LIB_MARKER] : [];
  return [...lib, ...TARGETS.filter((t) => t !== OWN[role])
    .flatMap((t) => [DOC_NUMBERS[t], printed(t)])];
}

/** May `role` open this record at all (else 404)? */
function opens(role: Role, t: Target, kind: Kind): boolean {
  if (role === "owner" || role === "hr" || t === OWN[role]) return true;
  if (kind === "letter") return false;
  return role === "manager" && kind !== "download" && REPORTS.includes(t);
}

const routes = DOCUMENT_ROUTES.filter((r) => r.method === "GET" &&
  !PLAN7_PENDING.has(r.id));

describe("Plan 7 routes leak nothing a viewer may not see", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  let docs: Record<Target, SeededDoc>;
  let lib: string;
  let tmpl: string;
  const letters = {} as Record<Target, string>;
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    s = await seedCompany(ctx, "leakdoc");
    docs = await seedDocuments(ctx, s);
    const f = await upload(ctx.app, s.hr.token, s.companyId, "l.pdf",
      fakePdf(LIB_MARKER));
    lib = (await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/library", { title: "Handbook", category: "handbook",
        fileId: f.id, requiresAck: false, audience: { allStaff: false,
          departmentIds: [], employeeIds: [s.emp.report], roles: [] } }))
      .body.id;
    const all = (await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/letter-templates")).body.items;
    tmpl = all[0].id;
    const cert = all.find((x: { kind: string; lang: string }) =>
      x.kind === "salary-certificate" && x.lang === "en").id;
    for (const t of TARGETS) {
      letters[t] = (await call(ctx.app, s.hr.token, s.companyId, "POST",
        "/v1/letters", { templateId: cert, employeeId: s.emp[t],
          inputs: { "input.addressee": "Bank", "input.purpose": "Loan" } }))
        .body.id;
    }
  });
  const pathOf = (r: RouteDef, t: Target | null): string => {
    if (ID_KIND[r.id] === "library") return r.path.replace("{id}", lib);
    if (ID_KIND[r.id] === "template") return r.path.replace("{id}", tmpl);
    if (t === null) return r.path;
    if (ID_KIND[r.id] === "letter") return r.path.replace("{id}", letters[t]);
    const d = docs[t];
    return r.path.replace("{id}", ID_KIND[r.id] === "employee"
      ? s.emp[t] : d.id).replace("{versionId}", d.versionId);
  };
  const expected = (r: RouteDef, role: Role, t: Target | null) =>
    !r.roles.includes(role) ? 403
    : ID_KIND[r.id] === "library" && role === "manager" ? 404
    : t !== null && !opens(role, t, ID_KIND[r.id] ?? null) ? 404 : 200;

  it("every served GET route has a fixture", () => {
    for (const r of routes) expect(r.id in ID_KIND, r.id).toBe(true);
  });

  for (const r of routes) {
    it(r.id, async () => {
      const k = ID_KIND[r.id];
      const targets = k === null || k === "library" || k === "template"
        ? [null] : TARGETS;
      for (const role of ROLES) {
        for (const t of targets) {
          const res = await ctx.app.request(pathOf(r, t), { headers: {
            authorization: `Bearer ${s[role].token}`,
            "x-company-id": s.companyId } });
          const text = Buffer.from(await res.arrayBuffer())
            .toString("latin1");
          const label = `${r.id} as ${role} on ${t}`;
          expect(res.status, `${label}: ${text}`)
            .toBe(expected(r, role, t));
          expect(forbidden(role).filter((x) => text.includes(x)), label)
            .toEqual([]);
        }
      }
    });
  }

  it("owner bodies carry the numbers (the test is not vacuous)",
    async () => {
      for (const t of TARGETS) {
        const res = await ctx.app.request(pathOf(routes.find((r) =>
          r.id === "employeeDocumentGet")!, t), { headers: {
          authorization: `Bearer ${s.owner.token}`,
          "x-company-id": s.companyId } });
        expect(await res.text()).toContain(DOC_NUMBERS[t]);
        const l = await ctx.app.request(`/v1/letters/${letters[t]}/download`,
          { headers: { authorization: `Bearer ${s.owner.token}`,
            "x-company-id": s.companyId } });
        expect(await l.text()).toContain(printed(t));
      }
    });
});
