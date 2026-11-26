import type { TimeProfile, TimeProfileUpdate } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { activeSites } from "./sites";

interface ProfileRow { employee_id: string;
  work_mode: TimeProfile["workMode"];
  geofence_mode: TimeProfile["geofenceMode"]; work_site_ids: string[];
  wfh_tracked: boolean; shift_worker: boolean }

/** Without a row: site work, no geofence, no sites, not tracked. */
export async function loadProfile(tx: Db, companyId: string,
  employeeId: string): Promise<TimeProfile> {
  const [r] = await tx.query<ProfileRow>(
    `SELECT * FROM employee_time_profiles WHERE company_id = $1
     AND employee_id = $2`, [companyId, employeeId]);
  if (r === undefined) {
    return { employeeId, workMode: "site", geofenceMode: "off",
      workSiteIds: [], wfhTracked: false, shiftWorker: false };
  }
  return { employeeId, workMode: r.work_mode,
    geofenceMode: r.geofence_mode, workSiteIds: r.work_site_ids,
    wfhTracked: r.wfh_tracked, shiftWorker: r.shift_worker };
}

/**
 * Every listed site must exist and be active (422 WORK_SITE_REQUIRED,
 * with the unknown ids counted); a geofence needs at least one.
 */
async function checkSites(tx: Db, companyId: string, b: TimeProfileUpdate) {
  const ids = [...new Set(b.workSiteIds)];
  const found = await activeSites(tx, companyId, ids);
  if (found.length !== ids.length) {
    throw new ApiError("WORK_SITE_REQUIRED", "a work site is unknown or " +
      "removed", { fields: ["body.workSiteIds"] });
  }
  if (b.geofenceMode !== "off" && ids.length === 0) {
    throw new ApiError("WORK_SITE_REQUIRED");
  }
  return ids;
}

export async function putProfile(tx: Db, companyId: string,
  employeeId: string, b: TimeProfileUpdate): Promise<TimeProfile> {
  const ids = await checkSites(tx, companyId, b);
  await tx.query(
    `INSERT INTO employee_time_profiles (company_id, employee_id,
       work_mode, geofence_mode, work_site_ids, wfh_tracked, shift_worker)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (employee_id) DO UPDATE SET work_mode = $3,
       geofence_mode = $4, work_site_ids = $5, wfh_tracked = $6,
       shift_worker = $7`,
    [companyId, employeeId, b.workMode, b.geofenceMode, ids, b.wfhTracked,
      b.shiftWorker]);
  return loadProfile(tx, companyId, employeeId);
}
