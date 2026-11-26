import type {
  WorkSite,
  WorkSiteCreate,
  WorkSiteUpdate,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

interface SiteRow { id: string; name: string; lat_e6: number;
  lng_e6: number; radius_m: number; status: WorkSite["status"] }

const E6 = 1_000_000;
const toSite = (r: SiteRow): WorkSite => ({ id: r.id, name: r.name,
  point: { lat: r.lat_e6 / E6, lng: r.lng_e6 / E6 }, radiusM: r.radius_m,
  status: r.status });
const e6 = (x: number) => Math.round(x * E6);

export async function listSites(tx: Db, companyId: string,
  activeOnly = false): Promise<WorkSite[]> {
  const rows = await tx.query<SiteRow>(
    `SELECT * FROM work_sites WHERE company_id = $1
     AND ($2::boolean = false OR status = 'active') ORDER BY name, id`,
    [companyId, activeOnly]);
  return rows.map(toSite);
}

async function loadSite(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<SiteRow>("SELECT * FROM work_sites WHERE " +
    "company_id = $1 AND id = $2 FOR UPDATE", [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function createSite(tx: Db, companyId: string, id: string,
  b: WorkSiteCreate): Promise<WorkSite> {
  await tx.query(
    `INSERT INTO work_sites (id, company_id, name, lat_e6, lng_e6,
       radius_m, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [id, companyId, b.name, e6(b.point.lat), e6(b.point.lng), b.radiusM]);
  return toSite(await loadSite(tx, companyId, id));
}

export async function updateSite(tx: Db, companyId: string, id: string,
  b: WorkSiteUpdate): Promise<WorkSite> {
  const r = await loadSite(tx, companyId, id);
  await tx.query(
    `UPDATE work_sites SET name = $3, lat_e6 = $4, lng_e6 = $5,
       radius_m = $6, status = $7 WHERE company_id = $1 AND id = $2`,
    [companyId, id, b.name ?? r.name,
      b.point ? e6(b.point.lat) : r.lat_e6,
      b.point ? e6(b.point.lng) : r.lng_e6, b.radiusM ?? r.radius_m,
      b.status ?? r.status]);
  return toSite(await loadSite(tx, companyId, id));
}

/** The active sites among `ids` (unknown or removed ids are dropped). */
export async function activeSites(tx: Db, companyId: string,
  ids: readonly string[]): Promise<WorkSite[]> {
  if (ids.length === 0) return [];
  const rows = await tx.query<SiteRow>(
    `SELECT * FROM work_sites WHERE company_id = $1 AND status = 'active'
     AND id = ANY($2::uuid[]) ORDER BY id`, [companyId, ids]);
  return rows.map(toSite);
}
