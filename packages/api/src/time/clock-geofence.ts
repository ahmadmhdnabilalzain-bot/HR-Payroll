import type { ClockBody } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { evaluateGeofence } from "./geofence";
import { loadProfile } from "./profiles";
import { getTimeSettings } from "./settings";
import { activeSites } from "./sites";

/** What a clock-in stores about how it was made. No coordinate. */
export interface ClockFacts {
  method: "web" | "phone" | "unknown";
  workLocation: "site" | "remote";
  geofenceMode: "off" | "record" | "require";
  result: "inside" | "outside" | "no-location" | "not-applied";
  siteId: string | null;
  distanceM: number | null;
  exception: "outside-geofence" | "no-location" | null;
}

function exceptionOf(mode: ClockFacts["geofenceMode"],
  result: ClockFacts["result"]): ClockFacts["exception"] {
  if (mode !== "require") return null;
  if (result === "outside") return "outside-geofence";
  return result === "no-location" ? "no-location" : null;
}

/**
 * Remote work needs a remote or hybrid profile (422
 * REMOTE_NOT_ALLOWED) and skips the geofence. A site clock-in is
 * checked against the profile's sites; a `require` geofence never
 * refuses (Ruling 12), it records an exception. The reading is used
 * here once and dropped.
 */
export async function clockFacts(tx: Db, companyId: string,
  employeeId: string, body: ClockBody | undefined): Promise<ClockFacts> {
  const profile = await loadProfile(tx, companyId, employeeId);
  const where = body?.workLocation ?? "site";
  const method = body?.method ?? "unknown";
  const base = { method, workLocation: where,
    geofenceMode: profile.geofenceMode } as const;
  if (where === "remote") {
    if (profile.workMode === "site") throw new ApiError("REMOTE_NOT_ALLOWED");
    return { ...base, result: "not-applied", siteId: null,
      distanceM: null, exception: null };
  }
  const sites = await activeSites(tx, companyId, profile.workSiteIds);
  const allowance = (await getTimeSettings(tx, companyId))
    .accuracyAllowanceM;
  const reading = body?.locationDecision === "declined" ||
    body?.locationDecision === "unavailable" ? null
    : body?.location ?? null;
  const g = evaluateGeofence(profile.geofenceMode, sites, reading,
    allowance);
  return { ...base, result: g.result, siteId: g.siteId,
    distanceM: g.distanceM,
    exception: exceptionOf(profile.geofenceMode, g.result) };
}
