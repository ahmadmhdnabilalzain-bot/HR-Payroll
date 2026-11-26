import type { ErrorCode, WfhState, WfhStatus } from "@payroll/contract";
import type { Db } from "../db/db";
import { loadProfile } from "../time/profiles";
import { LOCATION_INTERVAL_MINUTES } from "./limits";
import { getWfhSettings } from "./settings";

export interface RemoteRecord { id: string; clock_in: string;
  clock_out: string | null }

/** The employee's latest consent decision (append-only rows). */
export async function latestConsent(tx: Db, companyId: string,
  employeeId: string) {
  const [c] = await tx.query<{ notice_version: number; decision: string;
    at: string }>(
    `SELECT notice_version, decision, at FROM wfh_consents
     WHERE company_id = $1 AND employee_id = $2 ORDER BY seq DESC LIMIT 1`,
    [companyId, employeeId]);
  return c ?? null;
}

export async function openRemoteRecord(tx: Db, companyId: string,
  employeeId: string): Promise<RemoteRecord | null> {
  const [r] = await tx.query<RemoteRecord>(
    `SELECT id, clock_in, clock_out FROM attendance WHERE company_id = $1
     AND employee_id = $2 AND clock_out IS NULL
     AND work_location = 'remote'`, [companyId, employeeId]);
  return r ?? null;
}

/** Hourly location samples arrive with Task 10 (migration 908). */
async function lastLocation(_tx: Db, _companyId: string,
  _employeeId: string): Promise<string | null> {
  return null;
}

const plus = (ts: string, min: number) =>
  new Date(Date.parse(ts) + min * 60_000).toISOString();

/** The consent part of the state (before any attendance record). */
async function consentState(tx: Db, companyId: string, employeeId: string,
  version: number | null): Promise<WfhState | null> {
  const c = await latestConsent(tx, companyId, employeeId);
  if (c === null || c.notice_version !== version) return "needs-consent";
  return c.decision === "granted" ? null : "declined";
}

/**
 * off (disabled), not-tracked (profile), needs-consent (no decision
 * for the current notice), declined (declined or withdrawn), ready (no
 * open remote record), stopped-limit (open longer than the bound),
 * paused (an open pause), else tracking.
 */
export async function currentWfhState(tx: Db, now: Date, companyId: string,
  employeeId: string): Promise<WfhStatus & { record: RemoteRecord |
    null; boundMinutes: number }> {
  const s = await getWfhSettings(tx, companyId);
  const collects = { activeTime: true as const,
    categories: s.activityCategories, locationHourly: s.locationHourly };
  const base = { attendanceId: null, trackedUntil: null,
    lastLocationAt: null, nextLocationDueAt: null, collects,
    noticeVersion: s.noticeVersion, record: null,
    boundMinutes: s.maxTrackedMinutesPerRecord };
  if (!s.enabled) return { ...base, state: "off" };
  if (!(await loadProfile(tx, companyId, employeeId)).wfhTracked) {
    return { ...base, state: "not-tracked" };
  }
  const cs = await consentState(tx, companyId, employeeId, s.noticeVersion);
  if (cs !== null) return { ...base, state: cs };
  const rec = await openRemoteRecord(tx, companyId, employeeId);
  if (rec === null) return { ...base, state: "ready" };
  const until = plus(rec.clock_in, s.maxTrackedMinutesPerRecord);
  const last = await lastLocation(tx, companyId, employeeId);
  const more = { ...base, record: rec, attendanceId: rec.id,
    trackedUntil: until, lastLocationAt: last,
    nextLocationDueAt: last === null ? now.toISOString()
      : plus(last, LOCATION_INTERVAL_MINUTES) };
  if (now.toISOString() >= until) return { ...more, state: "stopped-limit" };
  const paused = await tx.query("SELECT 1 FROM wfh_pauses WHERE " +
    "company_id = $1 AND attendance_id = $2 AND ended_at IS NULL",
  [companyId, rec.id]);
  return { ...more, state: paused.length > 0 ? "paused" : "tracking" };
}

/** The error for a state that does not allow tracking. */
export const STATE_ERROR: Partial<Record<WfhState, ErrorCode>> = {
  "off": "TRACKING_DISABLED", "not-tracked": "NOT_TRACKED",
  "needs-consent": "CONSENT_REQUIRED", "declined": "CONSENT_REQUIRED",
  "ready": "NOT_REMOTE_RECORD", "stopped-limit": "TRACKING_LIMIT_REACHED",
};

export const publicStatus = (s: WfhStatus & { record: unknown;
  boundMinutes: number }): WfhStatus => {
  const { record: _r, boundMinutes: _b, ...rest } = s;
  return rest;
};
