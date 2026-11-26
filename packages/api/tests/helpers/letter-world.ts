import { seedCompany, type SeedUser } from "./seed";
import { call, callBytes, makeApp } from "./test-app";

const START = "2026-11-26T08:00:00.000Z";

/** Inputs a salary certificate or NOC needs. */
export const CERT = { inputs: { "input.addressee": "Example Bank",
  "input.purpose": "Account opening" } };

/** A seeded company with an Arabic name and helpers for letters. */
export async function letterWorld(name: string,
  opts: Parameters<typeof makeApp>[0] = {}) {
  const ctx = await makeApp({ start: START, ...opts });
  const s = await seedCompany(ctx, name);
  await call(ctx.app, s.owner.token, s.companyId, "PATCH", "/v1/company",
    { nameAr: "شركة مثال" });
  const req = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const templates = (await req(s.hr, "GET", "/v1/letter-templates")).body
    .items as { id: string; kind: string; lang: string;
      current: { id: string } }[];
  const tmpl = (kind: string, lang = "en") =>
    templates.find((t) => t.kind === kind && t.lang === lang)!;
  const issue = (u: SeedUser, kind: string, body: object, lang = "en") =>
    req(u, "POST", "/v1/letters", { templateId: tmpl(kind, lang).id,
      inputs: {}, ...body });
  const download = (u: SeedUser, id: string) => callBytes(ctx.app, u.token,
    s.companyId, `/v1/letters/${id}/download`);
  return { ctx, s, req, tmpl, issue, download };
}
