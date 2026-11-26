import type { App } from "../../src/http/context";
import { salaryOf, type Seeded } from "./seed";
import { call } from "./test-app";

const ALL_TRUE = { workPermitValid: true, paidViaWps: true,
  gpssaRegistered: true };

async function must(p: Promise<{ status: number; text: string;
  body: any }>, want: number) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

/**
 * Adds `n` active employees (basic "7000.00", above the minimum wage).
 * The first `nationals` are UAE nationals with every counting flag
 * true; the first `skilled` new employees are skilled, and every other
 * employee of the company (seeded ones too) is not, so no flag is
 * left null. Returns the new ids.
 */
export async function seedHeadcount(ctx: { app: App }, s: Seeded,
  n: number, opts: { nationals: number; skilled: number })
  : Promise<string[]> {
  const put = (id: string, flags: object) => must(call(ctx.app,
    s.hr.token, s.companyId, "PUT", `/v1/employees/${id}/emiratisation`,
    flags), 200);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const national = i < opts.nationals;
    const e = await must(call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/employees", { number: `H-${i}`, fullName: `Head ${i}`,
        jobTitle: "Clerk", nationality: national ? "AE" : "IN",
        workerClass: national ? "uae-national" : "expat-full-time",
        joiningDate: "2020-01-01" }), 201);
    await must(call(ctx.app, s.hr.token, s.companyId, "PUT",
      `/v1/employees/${e.id}/salary`, salaryOf("7000.00")), 200);
    await put(e.id, { ...ALL_TRUE, skilled: i < opts.skilled });
    ids.push(e.id);
  }
  for (const id of Object.values(s.emp)) {
    await put(id, { ...ALL_TRUE, skilled: false });
  }
  return ids;
}
