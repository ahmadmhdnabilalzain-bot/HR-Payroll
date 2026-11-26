import type { WfhSettings } from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { co, selfEmployee } from "../time/ctx";
import { loadProfile } from "../time/profiles";
import { checkSampleTime, type SampleWindow } from "./sample-window";
import { getWfhSettings } from "./settings";
import { latestConsent } from "./status";

export interface Upload { employeeId: string; settings: WfhSettings;
  window: SampleWindow }

/**
 * The current state allows tracking (settings on, profile tracked,
 * current consent granted; else the Task 9 code), and the record is
 * the caller's own remote record (else 422 NOT_REMOTE_RECORD). Late
 * uploads for a closed record pass when every sample is in its window.
 */
export async function uploadContext(ctx: ReqCtx, attendanceId: string)
  : Promise<Upload> {
  const emp = selfEmployee(ctx);
  const s = await getWfhSettings(ctx.tx, co(ctx));
  if (!s.enabled) throw new ApiError("TRACKING_DISABLED");
  if (!(await loadProfile(ctx.tx, co(ctx), emp)).wfhTracked) {
    throw new ApiError("NOT_TRACKED");
  }
  const c = await latestConsent(ctx.tx, co(ctx), emp);
  if (c === null || c.decision !== "granted" ||
    c.notice_version !== s.noticeVersion) {
    throw new ApiError("CONSENT_REQUIRED");
  }
  const [r] = await ctx.tx.query<{ clock_in: string;
    clock_out: string | null }>(
    `SELECT clock_in, clock_out FROM attendance WHERE company_id = $1
     AND id = $2 AND employee_id = $3 AND work_location = 'remote'`,
    [co(ctx), attendanceId, emp]);
  if (r === undefined) throw new ApiError("NOT_REMOTE_RECORD");
  const pauses = await ctx.tx.query<{ start: string; end: string | null }>(
    `SELECT started_at AS start, ended_at AS "end" FROM wfh_pauses
     WHERE company_id = $1 AND attendance_id = $2`, [co(ctx), attendanceId]);
  return { employeeId: emp, settings: s, window: { clockIn: r.clock_in,
    clockOut: r.clock_out, boundMinutes: s.maxTrackedMinutesPerRecord,
    consentAt: c.at, pauses, now: ctx.deps.now().toISOString() } };
}

/** The first sample outside its window refuses the whole upload. */
export function assertInWindow(times: string[], w: SampleWindow): void {
  for (const [i, at] of times.entries()) {
    const r = checkSampleTime(at, w);
    if (r === "ok") continue;
    throw new ApiError(r === "paused" ? "TRACKING_PAUSED"
      : "SAMPLE_OUTSIDE_CLOCKED_TIME", undefined, { index: String(i) });
  }
}
