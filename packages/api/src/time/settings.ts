import type {
  TimeSettings,
  TimeSettingsUpdate,
  Weekday,
} from "@payroll/contract";
import type { Db } from "../db/db";

type Tunable = Exclude<keyof TimeSettingsUpdate, "restDays">;

/**
 * Product defaults, not law: shown in `productDefaults` while the
 * company has not set its own value. Rest days have no default.
 */
export const TIME_PRODUCT_DEFAULTS: Readonly<Record<Tunable, number>> = {
  graceMinutes: 5,
  lateFlagThreshold: 3,
  restAdjacentAbsenceThreshold: 2,
  shortSickSpellThreshold: 3,
  accuracyAllowanceM: 50,
};

const COLUMNS: Record<Tunable, string> = {
  graceMinutes: "grace_minutes",
  lateFlagThreshold: "late_flag_threshold",
  restAdjacentAbsenceThreshold: "rest_adjacent_absence_threshold",
  shortSickSpellThreshold: "short_sick_spell_threshold",
  accuracyAllowanceM: "accuracy_allowance_m",
};
const TUNABLES = Object.keys(COLUMNS) as Tunable[];

type Row = Record<string, unknown> & { rest_days: Weekday[] | null };

function fromRow(r: Row | undefined): TimeSettings {
  const out = { restDays: r?.rest_days ?? [], productDefaults: [] } as
    unknown as TimeSettings;
  for (const k of TUNABLES) {
    const v = r?.[COLUMNS[k]];
    if (v === null || v === undefined) {
      out[k] = TIME_PRODUCT_DEFAULTS[k];
      out.productDefaults.push(k);
    } else out[k] = Number(v);
  }
  return out;
}

/** The company's settings, or the product defaults. Never throws. */
export async function getTimeSettings(tx: Db, companyId: string)
  : Promise<TimeSettings> {
  const [r] = await tx.query<Row>(
    "SELECT * FROM company_time_settings WHERE company_id = $1",
    [companyId]);
  return fromRow(r);
}

/** Upserts the given keys only; untouched keys keep their state. */
export async function putTimeSettings(tx: Db, companyId: string,
  b: TimeSettingsUpdate, at: string): Promise<TimeSettings> {
  await tx.query(
    `INSERT INTO company_time_settings (company_id, updated_at)
     VALUES ($1, $2) ON CONFLICT (company_id) DO NOTHING`, [companyId, at]);
  const sets: string[] = ["updated_at = $2"];
  const args: unknown[] = [companyId, at];
  if (b.restDays !== undefined) {
    args.push(b.restDays);
    sets.push(`rest_days = $${args.length}`);
  }
  for (const k of TUNABLES) {
    if (b[k] === undefined) continue;
    args.push(b[k]);
    sets.push(`${COLUMNS[k]} = $${args.length}`);
  }
  await tx.query(`UPDATE company_time_settings SET ${sets.join(", ")}
    WHERE company_id = $1`, args);
  return getTimeSettings(tx, companyId);
}
