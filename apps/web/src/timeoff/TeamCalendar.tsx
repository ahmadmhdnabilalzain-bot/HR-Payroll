import { useState } from "react";
import type { LeaveTypeId } from "../demo/data/people-types";
import { useDemo } from "../demo/state";
import { requestRows, leaveIds, type RequestRow } from "../demo/time-off";
import { formatMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { daysText, rangeText } from "../people/words";
import { Icon } from "../ui/Icon";
import p from "../people/page.module.css";
import s from "./timeoff.module.css";

const TYPE: Record<LeaveTypeId, MessageKey> = {
  "lt-annual": "timeoff.annual", "lt-sick": "timeoff.sick",
  "lt-unpaid": "timeoff.unpaid",
};

const pad = (n: number): string => String(n).padStart(2, "0");

function monthDays(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`);
}

function shift(ym: string, by: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

const isWeekend = (iso: string): boolean => {
  const [y, m, d] = iso.split("-").map(Number);
  const w = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return w === 0 || w === 6;
};

/** A rest day: the weekend or a sample public holiday (not counted). */
type Rest = (iso: string) => boolean;

/** Booked and waiting time off overlapping a month, one row a person. */
export function offInMonth(rows: RequestRow[], ym: string): RequestRow[] {
  const days = monthDays(ym);
  const from = days[0] ?? "";
  const to = days.at(-1) ?? "";
  return rows.filter((r) => (r.state === "booked" || r.state === "waiting")
    && r.startDate <= to && r.endDate >= from);
}

/**
 * Who is off, a month at a time: quiet bars on a day grid (booked
 * filled, waiting outlined), weekends shaded, today marked. On a
 * phone it becomes a plain list of names and dates.
 */
export function TeamCalendar() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const today = data.people.asOf;
  const weekend: Rest = (iso) => isWeekend(iso) ||
    data.people.holidayOn(iso) !== null;
  const ids = new Set(leaveIds(data, state));
  const all = requestRows(data, state).filter((r) => ids.has(r.employeeId));
  // Opens on this month, or the next one with someone off (two ahead).
  const [ym, setYm] = useState(() => [0, 1, 2].map((n) =>
    shift(today.slice(0, 7), n)).find((m) => offInMonth(all, m).length > 0)
    ?? today.slice(0, 7));
  const rows = offInMonth(all, ym);
  const days = monthDays(ym);
  const month = formatMonth(ym, lang);
  const people = [...new Set(rows.map((r) => r.employeeId))];
  return (
    <section className={p.section} aria-labelledby="cal-title">
      <header className={p.sectionHead}>
        <h2 id="cal-title" className={p.sectionTitle}>
          {t("timeoff.calendar")}
        </h2>
        <div className={s.monthNav}>
          <button type="button" className={s.navBtn}
            aria-label={t("timeoff.prevMonth")}
            onClick={() => setYm(shift(ym, -1))}>
            <span className={s.flip}><Icon name="chevronEnd" size={18} />
            </span>
          </button>
          <span className={s.month} aria-live="polite">{month}</span>
          <button type="button" className={s.navBtn}
            aria-label={t("timeoff.nextMonth")}
            onClick={() => setYm(shift(ym, 1))}>
            <Icon name="chevronEnd" size={18} />
          </button>
        </div>
      </header>
      {people.length === 0 ? (
        <p className={p.empty}>{t("timeoff.calendarEmpty", { month })}</p>
      ) : (
        <>
          <div className={s.grid} role="table" aria-label={month}
            style={{ gridTemplateColumns:
              `minmax(160px, 220px) repeat(${days.length}, minmax(0, 1fr))` }}>
            <div role="row" className={s.gridRow}>
              <span role="columnheader" className={s.gridCorner}>
                <span className="visually-hidden">{t("timeoff.employee")}
                </span>
              </span>
              {days.map((d) => (
                <span key={d} role="columnheader" className={s.dayHead}
                  data-weekend={weekend(d)} data-today={d === today}
                  title={data.people.holidayOn(d) ?? undefined}>
                  {Number(d.slice(8))}
                </span>
              ))}
            </div>
            {people.map((id) => {
              const mine = rows.filter((r) => r.employeeId === id);
              const who = data.people.person(id);
              return (
                <div key={id} role="row" className={s.gridRow}>
                  <span role="rowheader" className={s.gridName}>
                    <span>{who?.name[lang]}</span>
                    <span className={s.gridType}>
                      {[...new Set(mine.map((r) => t(TYPE[r.leaveTypeId])))]
                        .join(", ")}
                    </span>
                  </span>
                  {days.map((d) => {
                    const r = mine.find((x) => x.startDate <= d &&
                      d <= x.endDate);
                    const on = r !== undefined && !weekend(d);
                    return (
                      <span key={d} role="cell" className={s.cell}
                        data-weekend={weekend(d)} data-today={d === today}
                        data-on={on ? r.state : undefined}
                        data-start={on && (r.startDate === d ||
                          weekend(prev(d)) || d.endsWith("-01"))}
                        data-end={on && (r.endDate === d || weekend(next(d)))}>
                        {on && <span className="visually-hidden">
                          {t(r.state === "booked" ? "timeoff.legendBooked"
                            : "timeoff.legendWaiting")}</span>}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <ul className={s.offList}>
            {rows.map((r) => (
              <li key={r.id} className={s.offItem}>
                <span className={s.offName}>
                  {data.people.person(r.employeeId)?.name[lang]}
                </span>
                <span className={s.offWhen}>
                  {t(TYPE[r.leaveTypeId])} · {rangeText(r.startDate,
                    r.endDate, lang)} · {daysText(r.halves, t, lang)}
                </span>
                <span className={p.status} data-tone={r.state === "booked"
                  ? "done" : "warn"}>
                  {t(r.state === "booked" ? "timeoff.legendBooked"
                    : "timeoff.legendWaiting")}
                </span>
              </li>
            ))}
          </ul>
          <p className={s.legend}>
            <span className={s.key} data-on="booked" aria-hidden="true" />
            {t("timeoff.legendBooked")}
            <span className={s.key} data-on="waiting" aria-hidden="true" />
            {t("timeoff.legendWaiting")}
            <span className={s.key} data-on="rest" aria-hidden="true" />
            {t("timeoff.legendRest")}
          </p>
        </>
      )}
    </section>
  );
}

function prev(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
}

function next(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
}
