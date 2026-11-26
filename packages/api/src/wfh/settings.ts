import {
  NEVER_COLLECTED,
  RETENTION_SOURCE,
  type WfhSettings,
  type WfhSettingsUpdate,
} from "@payroll/contract";
import { EngineError, loadWfhRetention, selectPack, TIME_PACKS }
  from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { DEFAULT_MAX_TRACKED_MINUTES } from "./limits";

interface Row { enabled: boolean; retention_days: number | null;
  activity_categories: boolean; location_each_hour: boolean;
  max_tracked_minutes: number; impact_assessment_done: boolean;
  impact_assessment_date: string | null;
  legal_review: WfhSettings["legalReview"];
  notice_version: number | null }

const fromRow = (r: Row | undefined): WfhSettings => ({
  enabled: r?.enabled ?? false, retentionDays: r?.retention_days ?? null,
  activityCategories: r?.activity_categories ?? true,
  locationHourly: r?.location_each_hour ?? true,
  maxTrackedMinutesPerRecord: r?.max_tracked_minutes ??
    DEFAULT_MAX_TRACKED_MINUTES,
  impactAssessment: { done: r?.impact_assessment_done ?? false,
    date: r?.impact_assessment_date ?? null },
  legalReview: r?.legal_review ?? "not-reviewed",
  noticeVersion: r?.notice_version ?? null,
  neverCollected: [...NEVER_COLLECTED], retentionSource: RETENTION_SOURCE });

export async function getWfhSettings(tx: Db, companyId: string,
  lock = false): Promise<WfhSettings> {
  const [r] = await tx.query<Row>(
    `SELECT * FROM wfh_settings WHERE company_id = $1
     ${lock ? "FOR UPDATE" : ""}`, [companyId]);
  return fromRow(r);
}

/**
 * The retention period through the engine: the pack value is
 * unsourced (PDPL sets none), so a missing company value refuses.
 */
export function retentionDays(s: WfhSettings, today: string): number {
  try {
    return loadWfhRetention(selectPack(TIME_PACKS, today),
      s.retentionDays).v;
  } catch (e) {
    if (e instanceof EngineError) throw new ApiError("RETENTION_REQUIRED");
    throw e;
  }
}

/** Enabling needs retention, an attested assessment and a notice. */
export function assertEnablable(s: WfhSettings, today: string): void {
  if (!s.enabled) return;
  retentionDays(s, today);
  if (!s.impactAssessment.done) {
    throw new ApiError("IMPACT_ASSESSMENT_REQUIRED");
  }
  if (s.noticeVersion === null) throw new ApiError("NOTICE_REQUIRED");
}

export const merge = (s: WfhSettings, b: WfhSettingsUpdate): WfhSettings =>
  ({ ...s, ...Object.fromEntries(Object.entries(b).filter(([, v]) =>
    v !== undefined)) });

export async function saveWfhSettings(tx: Db, companyId: string,
  s: WfhSettings, at: string): Promise<void> {
  await tx.query(
    `INSERT INTO wfh_settings (company_id, enabled, retention_days,
       activity_categories, location_each_hour, max_tracked_minutes,
       impact_assessment_done, impact_assessment_date, legal_review,
       notice_version, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (company_id) DO UPDATE SET enabled = $2,
       retention_days = $3, activity_categories = $4, location_each_hour = $5,
       max_tracked_minutes = $6, impact_assessment_done = $7,
       impact_assessment_date = $8, legal_review = $9,
       notice_version = $10, updated_at = $11`,
    [companyId, s.enabled, s.retentionDays, s.activityCategories,
      s.locationHourly, s.maxTrackedMinutesPerRecord,
      s.impactAssessment.done, s.impactAssessment.date, s.legalReview,
      s.noticeVersion, at]);
}
