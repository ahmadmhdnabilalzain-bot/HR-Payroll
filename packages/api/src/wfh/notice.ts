import {
  NEVER_COLLECTED,
  type WfhNotice,
  type WfhSettings,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { renderNotice } from "./notice-template";
import { retentionDays, saveWfhSettings } from "./settings";

interface Row { version: number; published_at: string; text_en: string;
  collects: WfhNotice["collects"]; retention_days: number;
  legal_review: WfhNotice["legalReview"]; company_note: string | null }

const toNotice = (r: Row): WfhNotice => ({ version: r.version,
  publishedAt: r.published_at, textEn: r.text_en, textAr: null,
  arabicStatus: "not-reviewed", collects: r.collects,
  neverCollected: [...NEVER_COLLECTED], retentionDays: r.retention_days,
  legalReview: r.legal_review, companyNote: r.company_note });

export async function currentNotice(tx: Db, companyId: string)
  : Promise<WfhNotice | null> {
  const [r] = await tx.query<Row>(
    `SELECT * FROM wfh_notices WHERE company_id = $1
     ORDER BY version DESC LIMIT 1`, [companyId]);
  return r === undefined ? null : toNotice(r);
}

/**
 * Publishes the next version from the template and points the
 * settings at it, so every earlier consent becomes stale. A
 * `companyNote` of undefined keeps the last one.
 */
export async function publishNotice(tx: Db, companyId: string,
  s: WfhSettings, note: string | null | undefined, at: string)
  : Promise<WfhNotice> {
  const days = retentionDays(s, at.slice(0, 10));
  const last = await currentNotice(tx, companyId);
  const [co] = await tx.query<{ name: string }>(
    "SELECT name FROM companies WHERE id = $1", [companyId]);
  const version = (last?.version ?? 0) + 1;
  const companyNote = note === undefined ? last?.companyNote ?? null : note;
  const collects = { activeTime: true as const,
    categories: s.activityCategories, locationHourly: s.locationHourly };
  const text = renderNotice({ companyName: co!.name, version,
    retentionDays: days, categories: s.activityCategories,
    locationHourly: s.locationHourly, legalReview: s.legalReview,
    companyNote });
  await tx.query(
    `INSERT INTO wfh_notices (company_id, version, published_at, text_en,
       collects, retention_days, legal_review, company_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [companyId, version, at, text, JSON.stringify(collects), days,
      s.legalReview, companyNote]);
  await saveWfhSettings(tx, companyId, { ...s, noticeVersion: version }, at);
  const n = await currentNotice(tx, companyId);
  if (n === null) throw new ApiError("INTERNAL");
  return n;
}
