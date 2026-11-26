import type { CSSProperties, ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { PageFoot } from "./PageFoot";
import { PageHead } from "./PageHead";
import s from "./templates.module.css";

export type CalTone = "booked" | "waiting" | "holiday" | "shift";

export interface CalEvent {
  rowId: string;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  tone: CalTone;
  label: string;
}

function daysOf(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, "0")}`);
}

const dow = (iso: string): number =>
  new Date(`${iso}T00:00:00Z`).getUTCDay();

const weekend = (iso: string): boolean => {
  const d = dow(iso);
  return d === 0 || d === 6;
};

const LETTER = ["S", "M", "T", "W", "T", "F", "S"];

/** The tones' words, shown in the legend (colour is never alone). */
const TONE_WORD: Record<CalTone, string> = { booked: "Booked",
  waiting: "Waiting", holiday: "Holiday", shift: "Shift" };

/**
 * CA, calendar: a month grid with people (or anything) as rows. Each event is
 * a bar across its days; a legend names the tones. Weekends (Saturday,
 * Sunday) are shaded. The labels are never squeezed into the day columns:
 * the month's list (day, what, whose, the tone's word) sits under the grid,
 * and on phones it replaces the grid, so nothing scrolls sideways. Pass
 * `agenda={false}` when the page lists the month itself (as `children`).
 * Month changes are the builder's (pass `onMonth`).
 */
export function MonthCalendar(p: {
  title: string;
  lede?: string;
  month: string;
  monthLabel: string;
  rows: { id: string; label: string }[];
  events: CalEvent[];
  onMonth?(step: -1 | 1): void;
  agenda?: boolean;
  /** What each tone means on this page ("Payday", "Done"). */
  legend?: Partial<Record<CalTone, string>>;
  /** The page's own content under the grid (a list of the month). */
  children?: ReactNode;
}) {
  const { t } = useLocale();
  const days = daysOf(p.month);
  const first = days[0] ?? "";
  const last = days.at(-1) ?? "";
  const mark = (rowId: string, day: string): CalEvent | undefined =>
    p.events.find((e) => e.rowId === rowId && e.start <= day &&
      day <= e.end);
  const inMonth = p.events.filter((e) => e.end >= first &&
    e.start <= last).sort((a, b) => a.start.localeCompare(b.start));
  const tones = [...new Set(inMonth.map((e) => e.tone))];
  const word = (x: CalTone): string => p.legend?.[x] ?? TONE_WORD[x];
  const rowLabel = (id: string): string =>
    p.rows.find((r) => r.id === id)?.label ?? "";
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} meta={p.onMonth && (
        <div className={s.segments}>
          <button type="button" onClick={() => p.onMonth?.(-1)}>
            {t("tpl.prevMonth")}</button>
          <span className={s.monthLabel}>{p.monthLabel}</span>
          <button type="button" onClick={() => p.onMonth?.(1)}>
            {t("tpl.nextMonth")}</button>
        </div>
      )} />
      {tones.length > 0 && (
        <ul className={s.legend} aria-label={p.monthLabel}>
          {tones.map((x) => (
            <li key={x}><span className={s.swatch} data-tone={x}
              aria-hidden="true" />{word(x)}</li>
          ))}
        </ul>
      )}
      <div className={s.calScroll} tabIndex={0} role="region"
        data-agenda={p.agenda !== false}
        aria-label={`${p.title}, ${p.monthLabel}`}>
        <table className={s.cal}
          style={{ "--days": days.length } as CSSProperties}>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">
                {t("tpl.who")}</span></th>
              {days.map((d) => (
                <th key={d} scope="col" data-weekend={weekend(d)}>
                  <span className={s.dow} aria-hidden="true">
                    {LETTER[dow(d)]}</span>
                  {Number(d.slice(8))}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.label}</th>
                {days.map((d) => {
                  const e = mark(r.id, d);
                  const starts = e !== undefined &&
                    (e.start === d || d === first);
                  return (
                    <td key={d} data-weekend={weekend(d)}
                      data-tone={e?.tone} data-start={starts}
                      data-end={e !== undefined && (e.end === d ||
                        d === last)} title={e?.label}>
                      {starts && (
                        <span className="visually-hidden">{e.label}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.agenda !== false && (
        <ul className={s.agenda} aria-label={p.monthLabel}>
          {inMonth.length === 0 ? <li className={s.empty}>–</li>
            : inMonth.map((e, i) => (
              <li key={i}>
                <span className={s.agendaDay}>
                  {Number((e.start < first ? first : e.start).slice(8))}
                  {e.end > e.start && e.end <= last
                    ? `–${Number(e.end.slice(8))}` : ""}
                </span>
                <span className={s.agendaText}>
                  <span>{e.label}</span>
                  {rowLabel(e.rowId) !== e.label && (
                    <small>{rowLabel(e.rowId)}</small>
                  )}
                </span>
                <span className={s.status} data-tone={TONE_OF[e.tone]}>
                  <span className={s.dot} aria-hidden="true" />
                  {word(e.tone)}
                </span>
              </li>
            ))}
        </ul>
      )}
      {p.children}
      <PageFoot />
    </div>
  );
}

const TONE_OF: Record<CalTone, string> = { booked: "done",
  waiting: "warn", holiday: "neutral", shift: "neutral" };
