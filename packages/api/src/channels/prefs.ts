import {
  NotificationPrefs,
  PREF_DEFAULTS,
  type NotificationPrefs as Prefs,
} from "@payroll/contract";
import type { Db } from "../db/db";

/** The user's stored preferences in this company, else the defaults. */
export async function getPrefs(tx: Db, companyId: string, userId: string)
  : Promise<Prefs> {
  const [r] = await tx.query<{ body: unknown }>(
    `SELECT body FROM notification_prefs
     WHERE company_id = $1 AND user_id = $2`, [companyId, userId]);
  if (r === undefined) return PREF_DEFAULTS;
  const p = NotificationPrefs.safeParse(r.body);
  return p.success ? p.data : PREF_DEFAULTS;
}

/** A person's own setting: stored without an audit row. */
export async function putPrefs(tx: Db, companyId: string, userId: string,
  body: Prefs, at: string): Promise<Prefs> {
  await tx.query(
    `INSERT INTO notification_prefs (company_id, user_id, body, updated_at)
     VALUES ($1, $2, $3, $4) ON CONFLICT (company_id, user_id)
     DO UPDATE SET body = $3, updated_at = $4`,
    [companyId, userId, JSON.stringify(body), at]);
  return body;
}
