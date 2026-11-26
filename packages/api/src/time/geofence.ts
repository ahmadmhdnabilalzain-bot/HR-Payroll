import type { GeoPoint, WorkSite } from "@payroll/contract";

/** Mean Earth radius in metres (IUGG). A unit choice, not law. */
const EARTH_RADIUS_M = 6371008.8;
const rad = (d: number) => d * Math.PI / 180;

/** Great-circle distance in metres. Pure. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface GeofenceOutcome {
  result: "inside" | "outside" | "no-location" | "not-applied";
  siteId: string | null;
  distanceM: number | null;
}

export type GeofenceMode = "off" | "record" | "require";
export type Reading = GeoPoint & { accuracyM: number };

/**
 * Mode off: not applied (the reading is ignored). No reading or no
 * active site: no-location. Else the nearest active site; inside when
 * the unrounded distance is within its radius plus the reading's
 * accuracy capped at the company allowance. The distance is kept to
 * the nearest 10 m; the reading itself is never returned.
 */
export function evaluateGeofence(mode: GeofenceMode, sites: WorkSite[],
  reading: Reading | null, allowanceM: number): GeofenceOutcome {
  if (mode === "off") {
    return { result: "not-applied", siteId: null, distanceM: null };
  }
  const active = sites.filter((s) => s.status === "active");
  if (reading === null || active.length === 0) {
    return { result: "no-location", siteId: null, distanceM: null };
  }
  const best = active.map((s) => ({ s, d: haversineMeters(reading,
    s.point) })).sort((x, y) => x.d - y.d || x.s.id.localeCompare(y.s.id))[0]!;
  const slack = Math.min(reading.accuracyM, allowanceM);
  return { result: best.d <= best.s.radiusM + slack ? "inside" : "outside",
    siteId: best.s.id, distanceM: Math.round(best.d / 10) * 10 };
}
