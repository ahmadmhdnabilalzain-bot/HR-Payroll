import type {
  ActivityCategory,
  WfhDay,
  WfhDayTotals,
  WfhLocationPoint,
} from "@payroll/contract";
import { addDays } from "@payroll/engine";
import type { Db } from "../db/db";
import { dubaiDate } from "../time/dubai";
import { wfhCutoff } from "./retention";

interface Minute { attendance_id: string; at: string; active: boolean;
  category: ActivityCategory | null }
interface Loc { at: string; lat_e3: number; lng_e3: number;
  source: WfhLocationPoint["source"] }

const DAY = 86_400_000;
const dubaiMidnight = (d: string) => Date.parse(`${d}T00:00:00+04:00`);
const empty = (): WfhDayTotals => ({ activeMinutes: 0, idleMinutes: 0,
  pausedMinutes: 0, categories: {} });

async function window(tx: Db, companyId: string, from: string, to: string,
  now: Date) {
  const lo = new Date(dubaiMidnight(from)).toISOString();
  const hi = new Date(dubaiMidnight(addDays(to, 1))).toISOString();
  const cut = await wfhCutoff(tx, companyId, now);
  return { lo: cut !== null && cut > lo ? cut : lo, hi };
}

export async function minutesIn(tx: Db, companyId: string, emp: string,
  from: string, to: string, now: Date): Promise<Minute[]> {
  const w = await window(tx, companyId, from, to, now);
  return tx.query<Minute>(
    `SELECT attendance_id, at, active, category FROM wfh_activity_minutes
     WHERE company_id = $1 AND employee_id = $2 AND at >= $3 AND at < $4
     ORDER BY at`, [companyId, emp, w.lo, w.hi]);
}

export async function locationsIn(tx: Db, companyId: string, emp: string,
  from: string, to: string, now: Date): Promise<WfhLocationPoint[]> {
  const w = await window(tx, companyId, from, to, now);
  const rows = await tx.query<Loc>(
    `SELECT at, lat_e3, lng_e3, source FROM wfh_location_samples
     WHERE company_id = $1 AND employee_id = $2 AND at >= $3 AND at < $4
     ORDER BY at`, [companyId, emp, w.lo, w.hi]);
  return rows.map((r) => ({ at: r.at, lat: r.lat_e3 / 1000,
    lng: r.lng_e3 / 1000, source: r.source }));
}

function add(t: WfhDayTotals, m: Minute) {
  if (m.active) t.activeMinutes++;
  else t.idleMinutes++;
  if (m.category !== null) {
    t.categories[m.category] = (t.categories[m.category] ?? 0) + 1;
  }
}

/** Paused minutes of each Dubai day, pauses clipped to the day. */
async function pausedByDay(tx: Db, companyId: string, emp: string,
  from: string, to: string, now: Date, out: Map<string, WfhDayTotals>) {
  const cut = await wfhCutoff(tx, companyId, now);
  const ps = await tx.query<{ s: string; e: string | null }>(
    `SELECT started_at AS s, ended_at AS e FROM wfh_pauses
     WHERE company_id = $1 AND employee_id = $2
     AND ($3::timestamptz IS NULL OR coalesce(ended_at, $4) >= $3)`,
    [companyId, emp, cut, now.toISOString()]);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const lo = dubaiMidnight(d);
    const mins = ps.reduce((n, p) => n + Math.max(0, Math.min(lo + DAY,
      Date.parse(p.e ?? now.toISOString())) - Math.max(lo,
      Date.parse(p.s))), 0) / 60_000;
    if (mins >= 1) {
      const t = out.get(d) ?? empty();
      t.pausedMinutes = Math.floor(mins);
      out.set(d, t);
    }
  }
}

/** Daily totals by Dubai date (used by timesheets and summaries). */
export async function wfhDayTotals(tx: Db, companyId: string, emp: string,
  from: string, to: string, now: Date): Promise<Map<string, WfhDayTotals>> {
  const out = new Map<string, WfhDayTotals>();
  for (const m of await minutesIn(tx, companyId, emp, from, to, now)) {
    const d = dubaiDate(new Date(Date.parse(m.at)));
    const t = out.get(d) ?? empty();
    add(t, m);
    out.set(d, t);
  }
  if (out.size > 0) await pausedByDay(tx, companyId, emp, from, to, now,
    out);
  return out;
}

const hourOf = (at: string) => new Date(Date.parse(at) + 4 * 3600_000)
  .toISOString().slice(11, 13);

/** The employee's own days: totals, hourly detail and locations. */
export async function ownDays(tx: Db, companyId: string, emp: string,
  from: string, to: string, now: Date): Promise<WfhDay[]> {
  const mins = await minutesIn(tx, companyId, emp, from, to, now);
  const locs = await locationsIn(tx, companyId, emp, from, to, now);
  const totals = await wfhDayTotals(tx, companyId, emp, from, to, now);
  const dates = [...new Set([...totals.keys(), ...locs.map((l) =>
    dubaiDate(new Date(Date.parse(l.at))))])].sort();
  return dates.map((date) => {
    const mine = mins.filter((m) => dubaiDate(new Date(Date.parse(m.at)))
      === date);
    const hours = new Map<string, WfhDayTotals>();
    for (const m of mine) {
      const h = hours.get(hourOf(m.at)) ?? empty();
      add(h, m);
      hours.set(hourOf(m.at), h);
    }
    return { date, attendanceIds: [...new Set(mine.map((m) =>
      m.attendance_id))], totals: totals.get(date) ?? empty(),
    hours: [...hours].sort().map(([hour, t]) => ({ hour,
      activeMinutes: t.activeMinutes, categories: t.categories })),
    locations: locs.filter((l) => dubaiDate(new Date(Date.parse(l.at)))
      === date) };
  });
}
