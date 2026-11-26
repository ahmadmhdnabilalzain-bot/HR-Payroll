import type { Company, CompanyUpdate } from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import { withTenant } from "../db/tenant";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

interface CompanyRow {
  id: string;
  name: string;
  name_ar: string | null;
  wps_employer_id: string | null;
  wps_bank_routing: string | null;
}

function toCompany(r: CompanyRow): Company {
  return { id: r.id, name: r.name, nameAr: r.name_ar,
    wps: { employerId: r.wps_employer_id,
      bankRoutingCode: r.wps_bank_routing } };
}

export async function loadCompany(tx: Db, id: string): Promise<CompanyRow> {
  const [row] = await tx.query<CompanyRow>(
    `SELECT id, name, name_ar, wps_employer_id, wps_bank_routing
     FROM companies WHERE id = $1`, [id]);
  if (row === undefined) throw new ApiError("NOT_FOUND");
  return row;
}

function merged(r: CompanyRow, b: CompanyUpdate): CompanyRow {
  return {
    ...r,
    name: b.name ?? r.name,
    name_ar: b.nameAr === undefined ? r.name_ar : b.nameAr,
    wps_employer_id: b.wps === undefined ? r.wps_employer_id
      : b.wps.employerId,
    wps_bank_routing: b.wps === undefined ? r.wps_bank_routing
      : b.wps.bankRoutingCode,
  };
}

async function updateCompany(ctx: ReqCtx<CompanyUpdate>) {
  const { deps, tenant, body } = ctx;
  const companyId = tenant!.companyId;
  const changed = Object.keys(body).filter((k) =>
    body[k as keyof CompanyUpdate] !== undefined).sort();
  return withTenant(deps.db, { companyId, userId: ctx.user!.id },
    async (tx) => {
      const next = merged(await loadCompany(tx, companyId), body);
      if (changed.length === 0) return toCompany(next);
      await tx.query(
        `UPDATE companies SET name = $2, name_ar = $3, wps_employer_id = $4,
         wps_bank_routing = $5 WHERE id = $1`, [companyId, next.name,
          next.name_ar, next.wps_employer_id, next.wps_bank_routing]);
      await appendAudit(tx, { companyId, at: deps.now().toISOString(),
        actorUserId: ctx.user!.id, action: "company.updated",
        entityType: "company", entityId: companyId, data: { changed } });
      return toCompany(next);
    });
}

export function registerCompanyRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "getCompany", (ctx) => withTenant(deps.db,
    { companyId: ctx.tenant!.companyId, userId: ctx.user!.id },
    async (tx) => toCompany(await loadCompany(tx, ctx.tenant!.companyId))));
  register(app, deps, "updateCompany", updateCompany);
}
