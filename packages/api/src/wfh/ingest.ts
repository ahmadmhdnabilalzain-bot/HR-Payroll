import type {
  WfhActivityUpload,
  WfhLocationPoint,
  WfhLocationUpload,
} from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { co } from "../time/ctx";
import { assertInWindow, uploadContext } from "./ingest-common";
import { LOCATION_INTERVAL_MINUTES } from "./limits";

/**
 * Activity minutes: all checks first, then `ON CONFLICT DO NOTHING`
 * (uploads are idempotent). Never audited, never logged.
 */
export async function ingestActivity(ctx: ReqCtx, b: WfhActivityUpload)
  : Promise<{ accepted: number; duplicates: number }> {
  const u = await uploadContext(ctx, b.attendanceId);
  assertInWindow(b.minutes.map((m) => m.at), u.window);
  if (!u.settings.activityCategories &&
    b.minutes.some((m) => m.category !== null)) {
    throw new ApiError("CATEGORY_NOT_COLLECTED");
  }
  let accepted = 0;
  for (const m of b.minutes) {
    const r = await ctx.tx.query(
      `INSERT INTO wfh_activity_minutes (company_id, employee_id,
         attendance_id, at, active, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (company_id, employee_id, at) DO NOTHING RETURNING at`,
      [co(ctx), u.employeeId, b.attendanceId, m.at, m.active, m.category]);
    accepted += r.length;
  }
  return { accepted, duplicates: b.minutes.length - accepted };
}

/** Rounded to 3 decimals (about 110 m) before storage. */
export const round3 = (x: number) => Math.round(x * 1000);

/**
 * One location: the same checks, then a 60-minute gap on both sides
 * of `at`, checked under the employee row lock so two posts at once
 * cannot both pass. Accuracy and the indicator flag are not stored.
 */
export async function ingestLocation(ctx: ReqCtx, b: WfhLocationUpload)
  : Promise<WfhLocationPoint> {
  const u = await uploadContext(ctx, b.attendanceId);
  assertInWindow([b.at], u.window);
  if (!u.settings.locationHourly) {
    throw new ApiError("LOCATION_NOT_COLLECTED");
  }
  const near = await ctx.tx.query(
    `SELECT 1 FROM wfh_location_samples WHERE company_id = $1
     AND employee_id = $2 AND at > $3::timestamptz - $4 * interval '1 minute'
     AND at < $3::timestamptz + $4 * interval '1 minute'`,
    [co(ctx), u.employeeId, b.at, LOCATION_INTERVAL_MINUTES]);
  if (near.length > 0) throw new ApiError("LOCATION_TOO_FREQUENT");
  const lat = round3(b.lat);
  const lng = round3(b.lng);
  const [r] = await ctx.tx.query<{ at: string }>(
    `INSERT INTO wfh_location_samples (id, company_id, employee_id,
       attendance_id, at, lat_e3, lng_e3, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING at`,
    [ctx.deps.newId(), co(ctx), u.employeeId, b.attendanceId, b.at, lat,
      lng, b.source]);
  return { at: r!.at, lat: lat / 1000, lng: lng / 1000, source: b.source };
}
