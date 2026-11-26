import type { WorkSite } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { evaluateGeofence, haversineMeters } from "../src/time/geofence";

const site = (id: string, lat: number, radiusM: number): WorkSite => ({
  id, name: id, point: { lat, lng: 1.5 }, radiusM, status: "active" });
const ID_A = "00000000-0000-4000-8000-0000000000a1";
const ID_B = "00000000-0000-4000-8000-0000000000b1";
/** Degrees of latitude for `m` metres on the mean-radius sphere. */
const deg = (m: number) => m / 6371008.8 * 180 / Math.PI;

describe("geofence", () => {
  it("0.01 degree of latitude is 1110 m after rounding", () => {
    const d = haversineMeters({ lat: 1.5, lng: 1.5 },
      { lat: 1.51, lng: 1.5 });
    expect(Math.round(d / 10) * 10).toBe(1110);
  });

  it("accuracy allowance is capped and the raw distance compared", () => {
    const s = site(ID_A, 1.5, 100);
    const at = { lat: 1.5 + deg(140), lng: 1.5 };
    const wide = evaluateGeofence("require", [s], { ...at, accuracyM: 80 },
      50);
    expect(wide).toEqual({ result: "inside", siteId: ID_A, distanceM: 140 });
    const tight = evaluateGeofence("require", [s],
      { ...at, accuracyM: 20 }, 50);
    expect(tight.result).toBe("outside");
    const edge = evaluateGeofence("record", [s],
      { lat: 1.5 + deg(124), lng: 1.5, accuracyM: 20 }, 50);
    expect(edge.result).toBe("outside");
    expect(edge.distanceM).toBe(120);
  });

  it("mode off ignores the reading; no reading is no-location", () => {
    const s = site(ID_A, 1.5, 100);
    expect(evaluateGeofence("off", [s], { lat: 1.5, lng: 1.5,
      accuracyM: 5 }, 50)).toEqual({ result: "not-applied", siteId: null,
      distanceM: null });
    expect(evaluateGeofence("require", [s], null, 50).result)
      .toBe("no-location");
  });

  it("the nearest active site wins", () => {
    const a = site(ID_A, 1.5, 100);
    const b = site(ID_B, 1.52, 100);
    const r = evaluateGeofence("record", [a, b], { lat: 1.519, lng: 1.5,
      accuracyM: 0 }, 50);
    expect(r.siteId).toBe(ID_B);
    expect(r.result).toBe("outside");
  });
});
