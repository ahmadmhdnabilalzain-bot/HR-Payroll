import type {
  Holiday,
  HolidayCreate,
  HolidayUpdate,
  SpecialPeriod,
  SpecialPeriodCreate,
  SpecialPeriodUpdate,
  Weekday,
} from "@payroll/contract";
import { toDayNumber } from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { assertRange } from "./range";
import { getTimeSettings } from "./settings";

interface HolidayRow { id: string; date: string; name: string;
  name_ar: string | null; kind: Holiday["kind"];
  status: Holiday["status"] }
interface PeriodRow { id: string; kind: "ramadan"; name: string;
  start_date: string; end_date: string; status: SpecialPeriod["status"] }

const toHoliday = (r: HolidayRow): Holiday => ({ id: r.id, date: r.date,
  name: r.name, nameAr: r.name_ar, kind: r.kind, status: r.status });
const toPeriod = (r: PeriodRow): SpecialPeriod => ({ id: r.id,
  kind: r.kind, name: r.name, start: r.start_date, end: r.end_date,
  status: r.status });

/** Special periods are 1 to 40 days (product bound, not law). */
const MAX_PERIOD_DAYS = 40;

export async function listHolidays(tx: Db, companyId: string, year: number)
  : Promise<Holiday[]> {
  const rows = await tx.query<HolidayRow>(
    `SELECT * FROM holidays WHERE company_id = $1
     AND extract(year FROM date) = $2 ORDER BY date, status, id`,
    [companyId, year]);
  return rows.map(toHoliday);
}

async function loadHoliday(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<HolidayRow>("SELECT * FROM holidays WHERE " +
    "company_id = $1 AND id = $2 FOR UPDATE", [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

async function assertFreeDate(tx: Db, companyId: string, date: string) {
  const taken = await tx.query("SELECT 1 FROM holidays WHERE company_id " +
    "= $1 AND date = $2 AND status = 'active'", [companyId, date]);
  if (taken.length > 0) throw new ApiError("HOLIDAY_EXISTS");
}

export async function createHoliday(tx: Db, companyId: string, id: string,
  b: HolidayCreate): Promise<Holiday> {
  await tx.query("SELECT 1 FROM companies WHERE id = $1 FOR UPDATE",
    [companyId]);
  await assertFreeDate(tx, companyId, b.date);
  await tx.query(
    `INSERT INTO holidays (id, company_id, date, name, name_ar, kind,
       status) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [id, companyId, b.date, b.name, b.nameAr ?? null, b.kind]);
  return toHoliday(await loadHoliday(tx, companyId, id));
}

/** Date and kind never change: remove and re-create instead. */
export async function updateHoliday(tx: Db, companyId: string, id: string,
  b: HolidayUpdate): Promise<Holiday> {
  const r = await loadHoliday(tx, companyId, id);
  if (b.status === "active" && r.status === "removed") {
    await assertFreeDate(tx, companyId, r.date);
  }
  await tx.query(
    `UPDATE holidays SET name = $3, name_ar = $4, status = $5
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, b.name ?? r.name,
      b.nameAr === undefined ? r.name_ar : b.nameAr, b.status ?? r.status]);
  return toHoliday(await loadHoliday(tx, companyId, id));
}

export async function listPeriods(tx: Db, companyId: string, year: number)
  : Promise<SpecialPeriod[]> {
  const rows = await tx.query<PeriodRow>(
    `SELECT * FROM special_periods WHERE company_id = $1
     AND extract(year FROM start_date) <= $2
     AND extract(year FROM end_date) >= $2 ORDER BY start_date, id`,
    [companyId, year]);
  return rows.map(toPeriod);
}

async function loadPeriod(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<PeriodRow>("SELECT * FROM special_periods " +
    "WHERE company_id = $1 AND id = $2 FOR UPDATE", [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

async function assertNoOverlap(tx: Db, companyId: string, p: PeriodRow |
  SpecialPeriodCreate & { id?: string }, start: string, end: string) {
  const rows = await tx.query(
    `SELECT 1 FROM special_periods WHERE company_id = $1 AND kind = $2
     AND status = 'active' AND start_date <= $4 AND end_date >= $3
     AND id IS DISTINCT FROM $5::uuid`,
    [companyId, p.kind, start, end, p.id ?? null]);
  if (rows.length > 0) throw new ApiError("PERIOD_OVERLAP");
}

export async function createPeriod(tx: Db, companyId: string, id: string,
  b: SpecialPeriodCreate): Promise<SpecialPeriod> {
  assertRange(b.start, b.end, MAX_PERIOD_DAYS);
  await tx.query("SELECT 1 FROM companies WHERE id = $1 FOR UPDATE",
    [companyId]);
  await assertNoOverlap(tx, companyId, b, b.start, b.end);
  await tx.query(
    `INSERT INTO special_periods (id, company_id, kind, name, start_date,
       end_date, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
    [id, companyId, b.kind, b.name, b.start, b.end]);
  return toPeriod(await loadPeriod(tx, companyId, id));
}

export async function updatePeriod(tx: Db, companyId: string, id: string,
  b: SpecialPeriodUpdate): Promise<SpecialPeriod> {
  const r = await loadPeriod(tx, companyId, id);
  if (b.status === "active" && r.status === "removed") {
    await assertNoOverlap(tx, companyId, r, r.start_date, r.end_date);
  }
  await tx.query(`UPDATE special_periods SET name = $3, status = $4
    WHERE company_id = $1 AND id = $2`,
  [companyId, id, b.name ?? r.name, b.status ?? r.status]);
  return toPeriod(await loadPeriod(tx, companyId, id));
}

export interface CompanyCalendar {
  holidays: Map<string, Holiday>;
  ramadan: { start: string; end: string }[];
  restDays: Weekday[];
}

/** Active holidays and periods touching [from, to], and rest days. */
export async function loadCalendar(tx: Db, companyId: string, from: string,
  to: string): Promise<CompanyCalendar> {
  const hs = await tx.query<HolidayRow>(
    `SELECT * FROM holidays WHERE company_id = $1 AND status = 'active'
     AND date BETWEEN $2 AND $3`, [companyId, from, to]);
  const ps = await tx.query<PeriodRow>(
    `SELECT * FROM special_periods WHERE company_id = $1
     AND status = 'active' AND start_date <= $3 AND end_date >= $2`,
    [companyId, from, to]);
  const settings = await getTimeSettings(tx, companyId);
  return { holidays: new Map(hs.map((h) => [h.date, toHoliday(h)])),
    ramadan: ps.map((p) => ({ start: p.start_date, end: p.end_date })),
    restDays: settings.restDays };
}

const WEEK: Weekday[] = ["thu", "fri", "sat", "sun", "mon", "tue", "wed"];

/** 1970-01-01 (day 0) was a Thursday; no `Date` involved. */
export function weekdayOf(date: string): Weekday {
  const n = toDayNumber(date) % 7;
  return WEEK[n < 0 ? n + 7 : n]!;
}

export const isCompanyRestDay = (cal: CompanyCalendar, date: string) =>
  cal.restDays.includes(weekdayOf(date));

export const isRamadan = (cal: CompanyCalendar, date: string) =>
  cal.ramadan.some((p) => p.start <= date && date <= p.end);
