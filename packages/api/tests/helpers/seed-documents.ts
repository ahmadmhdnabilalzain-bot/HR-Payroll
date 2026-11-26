import type { App } from "../../src/http/context";
import type { Seeded, Target } from "./seed";
import { call, fakePdf, upload, type Clock } from "./test-app";

/** A distinct passport number per seeded employee (leak sentinels). */
export const DOC_NUMBERS: Record<Target, string> = {
  manager: "P7777001",
  report: "P7777002",
  report2: "P7777003",
  outsider: "P7777004",
};

export interface SeededDoc { id: string; versionId: string }

/**
 * Every seeded employee gets a passport with their DOC_NUMBERS value,
 * expiry 2026-12-20, and a file `fakePdf(<number>)` (so a leaked
 * download shows the number too).
 */
export async function seedDocuments(ctx: { app: App; clock: Clock },
  s: Seeded): Promise<Record<Target, SeededDoc>> {
  const out = {} as Record<Target, SeededDoc>;
  for (const t of Object.keys(DOC_NUMBERS) as Target[]) {
    const n = DOC_NUMBERS[t];
    const f = await upload(ctx.app, s.hr.token, s.companyId, `${n}.pdf`,
      fakePdf(n));
    const r = await call(ctx.app, s.hr.token, s.companyId, "POST",
      `/v1/employees/${s.emp[t]}/documents`, { type: "passport",
        documentNumber: n, expiryDate: "2026-12-20", fileId: f.id });
    if (r.status !== 201) throw new Error(`doc ${r.status} ${r.text}`);
    out[t] = { id: r.body.id, versionId: r.body.current.id };
  }
  return out;
}
